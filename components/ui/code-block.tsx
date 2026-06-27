import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  content: string;
}

export function CodeBlock({ language, content }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (language === "inline") {
    return (
      <code className="bg-gray-100 dark:bg-[#2d2d2d] text-[var(--text-primary)] px-1.5 py-0.5 rounded-md font-mono text-sm border border-[var(--border)] mx-0.5 shadow-sm">
        {content}
      </code>
    );
  }

  return (
    <div className="relative group rounded-xl overflow-hidden my-4 border border-gray-200 dark:border-[#2d2d2d] shadow-md dark:shadow-none bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#252525] border-b border-gray-200 dark:border-[#2d2d2d]">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-gray-900 dark:text-[var(--text-muted)] dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none"
          title="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-0 overflow-x-auto custom-scrollbar">
        <SyntaxHighlighter
          language={language || "text"}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.875rem",
            lineHeight: "1.5",
          }}
          showLineNumbers
          wrapLines
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
