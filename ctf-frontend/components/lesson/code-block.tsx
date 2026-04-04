"use client";

import { useState, useCallback, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Terminal, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type CodeVariant = "default" | "vulnerable" | "secure";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  variant?: CodeVariant;
  showLineNumbers?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    headerBg: "bg-muted/50",
    headerBorder: "border-border",
    icon: Terminal,
    iconColor: "text-muted-foreground",
    labelColor: "text-muted-foreground",
    borderAccent: "border-l-primary",
    bgAccent: "bg-primary/5",
  },
  vulnerable: {
    headerBg: "bg-red-500/10",
    headerBorder: "border-red-500/30",
    icon: ShieldAlert,
    iconColor: "text-red-500",
    labelColor: "text-red-500",
    borderAccent: "border-l-red-500",
    bgAccent: "bg-red-500/5",
  },
  secure: {
    headerBg: "bg-green-500/10",
    headerBorder: "border-green-500/30",
    icon: ShieldCheck,
    iconColor: "text-green-500",
    labelColor: "text-green-500",
    borderAccent: "border-l-green-500",
    bgAccent: "bg-green-500/5",
  },
};

// Custom style to remove background from each line
const customOneDark = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: "transparent",
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: "transparent",
  },
};

export function CodeBlock({
  code,
  language = "text",
  title,
  variant = "default",
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const variantStyle = variantStyles[variant];
  const VariantIcon = variantStyle.icon;

  const displayTitle =
    title ||
    (variant === "vulnerable"
      ? "Vulnerable Code"
      : variant === "secure"
        ? "Secure Code"
        : null);
  const displayLanguage = language.charAt(0).toUpperCase() + language.slice(1);

  return (
    <div
      className={cn(
        "relative group rounded-lg overflow-hidden border border-l-4 my-4",
        variantStyle.borderAccent,
        variantStyle.bgAccent,
        className,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 border-b",
          variantStyle.headerBg,
          variantStyle.headerBorder,
        )}
      >
        <div className="flex items-center gap-2">
          <VariantIcon className={cn("w-4 h-4", variantStyle.iconColor)} />
          {displayTitle && (
            <span
              className={cn("text-sm font-medium", variantStyle.labelColor)}
            >
              {displayTitle}
            </span>
          )}
          {!displayTitle && (
            <span
              className={cn(
                "text-xs uppercase tracking-wide",
                variantStyle.labelColor,
              )}
            >
              {displayLanguage}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "cursor-pointer",
            "p-1.5 rounded transition-all",
            "hover:bg-background/50",
            copied ? "text-green-500" : "text-muted-foreground",
          )}
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Code */}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={customOneDark}
          customStyle={{
            margin: 0,
            padding: "1rem 1.25rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: "1.6",
          }}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: "2.5em",
            paddingRight: "1em",
            color: "#6b7280",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// Compact inline code for short snippets
interface InlineCodeProps {
  children: string;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [children]);

  return (
    <code
      className={cn(
        "relative inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/60 font-mono text-sm text-foreground",
        "border border-border",
        "hover:bg-muted/80 cursor-pointer transition-colors",
        className,
      )}
      onClick={handleCopy}
      title="Click to copy"
    >
      {children}
      {copied && <Check className="w-3 h-3 ml-1 text-green-500" />}
    </code>
  );
}

// Detect vulnerable/secure from code content heuristics
export function detectCodeVariant(code: string, language: string): CodeVariant {
  const lowerCode = code.toLowerCase();

  // Vulnerable patterns
  const vulnerablePatterns = [
    /\$_get/i,
    /\$_post/i,
    /\$_request/i, // PHP unsanitized input
    /concat.*\$/i, // String concatenation with variables
    /\'.*\$\w+.*\'/i, // SQL with interpolated variables (but only if not parameterized)
    /exec\s*\(/i,
    /system\s*\(/i,
    /shell_exec/i, // Command injection
    /eval\s*\(/i, // Code injection
    /innerhtml\s*=/i,
    /dangerouslysetinnerhtml/i, // XSS
    /password\s*=\s*['"].*['"]/i, // Hardcoded passwords
    /select.*from.*where.*=\s*\w+\s+and\s+\w+\s*=/i, // SQL with direct parameter comparison
  ];

  // Secure patterns - check these FIRST to avoid false positives
  const securePatterns = [
    /prepare\s*\(/i,
    /preparedstatement/i, // Prepared statements
    /bind_param\s*\(/i,
    /bindvalue\s*\(/i,
    /bindParam\s*\(/i, // Parameter binding
    /bindparam\s*\(/i,
    /bindvalue\s*\(/i, // Alternative spellings
    /param\s*\(/i, // Parameter binding
    /sanitize\s*\(/i,
    /escape\s*\(/i, // Input sanitization
    /white.*list/i, // Whitelist approach
    /escape\s*\(/i, // Output encoding
    /innertext/i, // Safe DOM insertion
    /setattribute\s*\(/i, // Safe attribute setting
    /\$stmt\s*=\s*\$/i, // Prepared statement variable in PHP
    /mysqli_prepare/i, // MySQLi prepare
    /\$.*->execute\s*\(/i, // PDO/MySQLi execute
  ];

  // Check secure patterns FIRST - they take priority
  if (securePatterns.some((pattern) => pattern.test(lowerCode))) {
    return "secure";
  }

  // Then check vulnerable patterns
  if (vulnerablePatterns.some((pattern) => pattern.test(lowerCode))) {
    return "vulnerable";
  }

  return "default";
}
export type { CodeVariant };
