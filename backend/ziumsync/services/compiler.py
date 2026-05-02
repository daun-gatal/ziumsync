from typing import Any, Dict

from ziumsync.models.domain import AuthType, Pipeline, SourceConnection, TargetConnection, TargetEngine


class PipelineCompilerService:
    @staticmethod
    def _flatten_dict(d: Dict[str, Any], parent_key: str = "", sep: str = ".") -> Dict[str, str]:
        items: list[tuple[str, str]] = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(PipelineCompilerService._flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, str(v)))
        return dict(items)

    @staticmethod
    def _inject_source_credentials(props: Dict[str, str], source: SourceConnection):
        if not source.credential:
            return

        cred = source.credential
        payload = cred.encrypted_payload

        if cred.auth_type == AuthType.BASIC:
            if "username" in payload:
                props["debezium.source.database.user"] = payload["username"]
            if "password" in payload:
                props["debezium.source.database.password"] = payload["password"]

    @staticmethod
    def _inject_target_credentials(props: Dict[str, str], target: TargetConnection):
        if not target.credential:
            return

        cred = target.credential
        payload = cred.encrypted_payload
        prefix = f"debezium.sink.{target.engine.value.lower()}."

        if cred.auth_type == AuthType.SASL_JAAS and target.engine == TargetEngine.KAFKA:
            if "sasl_mechanism" in payload:
                props[f"{prefix}producer.sasl.mechanism"] = payload["sasl_mechanism"]
            if "sasl_jaas_config" in payload:
                props[f"{prefix}producer.sasl.jaas.config"] = payload["sasl_jaas_config"]
            props[f"{prefix}producer.security.protocol"] = "SASL_SSL"

    @staticmethod
    def compile(pipeline: Pipeline) -> str:
        props: Dict[str, str] = {}

        # 1. Source Connection
        source = pipeline.source_connection
        props["debezium.source.database.hostname"] = source.host
        props["debezium.source.database.port"] = str(source.port)
        props["debezium.source.database.dbname"] = source.database_name

        # Auto-prefix source engine configs
        flat_source_config = PipelineCompilerService._flatten_dict(source.engine_config or {})
        for k, v in flat_source_config.items():
            props[f"debezium.source.{k}"] = v

        PipelineCompilerService._inject_source_credentials(props, source)

        # 2. Target Connection
        target = pipeline.target_connection
        props["debezium.sink.type"] = target.engine.value.lower()

        # Auto-prefix target engine configs
        flat_target_config = PipelineCompilerService._flatten_dict(target.engine_config or {})
        for k, v in flat_target_config.items():
            props[f"debezium.sink.{target.engine.value.lower()}.{k}"] = v

        PipelineCompilerService._inject_target_credentials(props, target)

        # 3. Formats & Snapshot Mode
        props["debezium.source.snapshot.mode"] = pipeline.snapshot_mode.value.lower()
        props["debezium.format.key.type"] = pipeline.key_format.value.lower()
        props["debezium.format.value.type"] = pipeline.value_format.value.lower()

        # 4. Table Filters
        included_tables = []
        excluded_tables = []
        for filter in pipeline.table_filters:
            table_str = f"{filter.schema_pattern}.{filter.table_pattern}"
            if filter.is_included:
                included_tables.append(table_str)
            else:
                excluded_tables.append(table_str)

        if included_tables:
            props["debezium.source.table.include.list"] = ",".join(included_tables)
        if excluded_tables:
            props["debezium.source.table.exclude.list"] = ",".join(excluded_tables)

        # 5. Transforms (SMTs)
        if pipeline.transforms:
            sorted_transforms = sorted(pipeline.transforms, key=lambda t: t.execution_order)
            transform_names = [t.name for t in sorted_transforms]
            props["debezium.transforms"] = ",".join(transform_names)

            for t in sorted_transforms:
                props[f"debezium.transforms.{t.name}.type"] = t.transform_type
                flat_transform_config = PipelineCompilerService._flatten_dict(t.configuration or {})
                for k, v in flat_transform_config.items():
                    props[f"debezium.transforms.{t.name}.{k}"] = v

        # 6. Advanced Properties (Dumped verbatim)
        flat_advanced = PipelineCompilerService._flatten_dict(pipeline.advanced_properties or {})
        for k, v in flat_advanced.items():
            props[k] = v

        # Generate the final properties string
        lines = [f"{k}={v}" for k, v in props.items()]
        return "\n".join(lines)
