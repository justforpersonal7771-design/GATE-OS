"use client";

import { memo } from "react";
import { RenderNode } from "@/types/ast.types";
import { MathJax } from "better-react-mathjax";

import { CodeBlock } from "@/components/ui/code-block";
import { ImageThemeAdapter } from "./image-theme-adapter";

import { PremiumImageGallery } from "./premium-image-gallery";

interface AstNodeRendererProps {
  nodes: RenderNode[];
  className?: string; // Additional classes for the container
}

function formatMarkdownText(text: string): React.ReactNode {
  if (!text) return "";
  
  // Split by bold (**bold**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return <strong key={idx} className="font-extrabold text-[var(--text-primary)]">{boldText}</strong>;
    }
    
    // Split by italic (*italic*)
    const italicParts = part.split(/(\*[^*]+\*)/g);
    return italicParts.map((subPart, subIdx) => {
      if (subPart.startsWith("*") && subPart.endsWith("*")) {
        return <em key={subIdx} className="italic text-[var(--text-secondary)]">{subPart.slice(1, -1)}</em>;
      }
      return subPart;
    });
  });
}

export const AstNodeRenderer = memo(function AstNodeRenderer({
  nodes,
  className = "",
}: AstNodeRendererProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div
      className={`ast-content ${className} items-center font-sans text-[var(--text-primary)]`}
    >
      {nodes.map((node, i) => {
        switch (node.type) {
          case "text":
            return (
              <span key={i} className="whitespace-pre-wrap">
                {formatMarkdownText(node.content)}
              </span>
            );
          case "latex-inline":
            return (
              <span key={i} className="inline-block px-1 pointer-events-none">
                <MathJax inline dynamic hideUntilTypeset="every">{`\\(${node.content}\\)`}</MathJax>
              </span>
            );
          case "latex-display":
            return (
              <div key={i} className="my-2 overflow-x-auto pointer-events-none">
                <MathJax dynamic hideUntilTypeset="every">{`\\[${node.content}\\]`}</MathJax>
              </div>
            );
          case "image":
            const urls = (node.resolvedUrls?.length ? node.resolvedUrls : [node.resolvedUrl]).filter(Boolean) as string[];
            return (
              <PremiumImageGallery
                key={i}
                urls={urls}
                altText={node.altText || "Question Content"}
              />
            );
          case "html":
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: node.content }}
                className="inline-block"
              />
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto my-2">
                <table className="table-auto border-collapse border border-[var(--border)]">
                  <tbody>
                    {node.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className="border border-[var(--border)] px-3 py-1"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <CodeBlock
                key={i}
                language={node.language}
                content={node.content}
              />
            );
          case "reference":
            return (
              <span
                key={i}
                className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-help"
                title={`Reference: ${node.targetId}`}
              >
                [{node.targetId}]
              </span>
            );
          default:
            return null;
        }
      })}
    </div>
  );
});
