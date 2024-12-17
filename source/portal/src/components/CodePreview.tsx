import React from "react";
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { materialLight as codeStyle } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodePreviewProps = {
  code: string;
} & Partial<SyntaxHighlighterProps>;

const CodePreview: React.FC<CodePreviewProps> = ({ code, ...rest }) => {
  return (
    <SyntaxHighlighter showLineNumbers={true} language="yaml" style={codeStyle} {...rest}>
      {code}
    </SyntaxHighlighter>
  );
};

export default CodePreview;