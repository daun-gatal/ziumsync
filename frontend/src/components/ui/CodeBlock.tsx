interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <div className="code-block">
      <pre>{code}</pre>
    </div>
  );
}
