from ziumsync.core.utils import deep_merge


def test_deep_merge_simple() -> None:
    base = {"a": 1, "b": 2}
    update = {"b": 3, "c": 4}
    result = deep_merge(base, update)
    assert result == {"a": 1, "b": 3, "c": 4}


def test_deep_merge_nested() -> None:
    base = {"config": {"host": "localhost", "port": 5432}}
    update = {"config": {"port": 5433}, "new_key": "value"}
    result = deep_merge(base, update)

    assert result["config"]["host"] == "localhost"
    assert result["config"]["port"] == 5433
    assert result["new_key"] == "value"


def test_deep_merge_does_not_mutate_original() -> None:
    base = {"config": {"a": 1}}
    update = {"config": {"b": 2}}
    deep_merge(base, update)

    assert "b" not in base["config"], "Base should not be mutated"
