"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type FC } from "react";
import { cn } from "@/lib/utils";

interface SimpleMarkdownTextProps {
    content: string;
    className?: string;
}

const SimpleMarkdownText: FC<SimpleMarkdownTextProps> = ({ content, className }) => {
  return (
    <div className={cn("aui-md", className)}>
        <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={defaultComponents}
        >
            {content}
        </ReactMarkdown>
    </div>
  );
};

export default SimpleMarkdownText;

const defaultComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h1: ({ className, ...props }: any) => (
    <h1 className={cn("mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h2: ({ className, ...props }: any) => (
    <h2 className={cn("mb-4 mt-8 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h3: ({ className, ...props }: any) => (
    <h3 className={cn("mb-4 mt-6 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h4: ({ className, ...props }: any) => (
    <h4 className={cn("mb-4 mt-6 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h5: ({ className, ...props }: any) => (
    <h5 className={cn("my-4 text-lg font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h6: ({ className, ...props }: any) => (
    <h6 className={cn("my-4 font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: ({ className, ...props }: any) => (
    <p className={cn("mb-5 mt-5 leading-7 first:mt-0 last:mb-0", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ className, ...props }: any) => (
    <a className={cn("text-primary font-medium underline underline-offset-4", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockquote: ({ className, ...props }: any) => (
    <blockquote className={cn("border-l-2 pl-6 italic", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ul: ({ className, ...props }: any) => (
    <ul className={cn("my-5 ml-6 list-disc [&>li]:mt-2", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ol: ({ className, ...props }: any) => (
    <ol className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hr: ({ className, ...props }: any) => (
    <hr className={cn("my-5 border-b", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ className, ...props }: any) => (
    <table className={cn("my-5 w-full border-separate border-spacing-0 overflow-y-auto", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: ({ className, ...props }: any) => (
    <th className={cn("bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: ({ className, ...props }: any) => (
    <td className={cn("border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tr: ({ className, ...props }: any) => (
    <tr className={cn("m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sup: ({ className, ...props }: any) => (
    <sup className={cn("[&>a]:text-xs [&>a]:no-underline", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: ({ className, ...props }: any) => (
    <pre className={cn("overflow-x-auto rounded-lg bg-black p-4 text-white", className)} {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, ...props }: any) => (
      <code
        className={cn("bg-muted rounded border font-semibold", className)}
        {...props}
      />
  ),
};