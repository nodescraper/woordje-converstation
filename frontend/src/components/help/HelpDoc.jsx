import * as React from "react";

const HELP_MD = `
# How Woordje Works

Woordje is a conversation practice app. You choose a language, topic or article, partner style, and model. Then the app keeps one live conversation going while it also explains what is happening in your text.

## Reading the colors

- \`blue\` words are already in your known vocabulary.
- \`orange\` words are important gaps worth learning.
- \`gray\` words are other words that are not currently marked as study targets.
- \`green\` correction boxes show the better version.
- \`red\` correction boxes show what you wrote when a fix was needed.

## What happens in a session

- You send a message in your target language.
- The backend annotates your text and checks it for corrections.
- The model writes the assistant reply and can stream its thinking.
- The app highlights useful words and detected grammar in the reply.
- Clicking a word opens the side panel with meaning, examples, and grammar notes.

## Sidebar tabs

- \`Vocab\` shows your saved vocabulary and lets you manage it.
- \`Grammar\` collects patterns the app detected across the conversation.
- \`Word\` shows details for the word you clicked in chat.

## Session setup

- \`Topic\` starts a free conversation around a theme you choose.
- \`Article\` loads one article and uses that as context.
- \`Advanced settings\` let you add extra agent instructions and custom focus words.

## Corrections and thinking

- Corrections are collapsed by default and can be expanded when you want details.
- The thinking panel opens while the model is streaming, then closes automatically.
- Change tags like \`article usage\` or \`word order\` summarize what was fixed.

## What stays on the client

- Your vocabulary list
- Session settings
- Selected topic, partner, and focus words

The backend is stateless. It receives the current session context on each request and returns the next annotated result.
`;

function renderInline(text) {
  const nodes = [];
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  parts.forEach((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code key={index} className="border border-border bg-secondary px-1.5 py-0.5 font-mono text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={index}>{part.slice(2, -2)}</strong>);
      return;
    }
    nodes.push(<React.Fragment key={index}>{part}</React.Fragment>);
  });
  return nodes;
}

function MiniMarkdown({ source }) {
  const lines = source.trim().split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({
      type: "p",
      text: paragraph.join(" "),
    });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({
      type: "ul",
      items: list,
    });
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h1", text: line.slice(2) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", text: line.slice(3) });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "h1") {
          return <h1 key={index} className="font-serif text-3xl font-semibold">{renderInline(block.text)}</h1>;
        }
        if (block.type === "h2") {
          return <h2 key={index} className="pt-2 font-serif text-xl font-semibold">{renderInline(block.text)}</h2>;
        }
        if (block.type === "ul") {
          return (
            <ul key={index} className="space-y-2 text-sm leading-6 text-muted-foreground">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 flex-none bg-foreground" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={index} className="text-sm leading-6 text-muted-foreground">{renderInline(block.text)}</p>;
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="border border-border bg-border">
      <div className="border-b border-border bg-card px-4 py-3 font-semibold">Visual legend</div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <div className="bg-card px-4 py-3 text-sm">
          <span className="w-known">bekend</span>
          <div className="mt-1 text-muted-foreground">Known vocabulary</div>
        </div>
        <div className="bg-card px-4 py-3 text-sm">
          <span className="w-gap">moeilijk</span>
          <div className="mt-1 text-muted-foreground">Important gap to learn</div>
        </div>
        <div className="bg-card px-4 py-3 text-sm">
          <span className="w-unknown">woord</span>
          <div className="mt-1 text-muted-foreground">Other untracked word</div>
        </div>
        <div className="bg-card px-4 py-3 text-sm">
          <span className="tone-gap inline-block border px-2 py-0.5 font-semibold">Perfect tense</span>
          <div className="mt-1 text-muted-foreground">Grammar chip in the reply</div>
        </div>
        <div className="bg-card px-4 py-3 text-sm">
          <span className="tone-success inline-block border px-2 py-0.5">better version</span>
          <div className="mt-1 text-muted-foreground">Suggested correction</div>
        </div>
        <div className="bg-card px-4 py-3 text-sm">
          <span className="tone-error inline-block border px-2 py-0.5">your original text</span>
          <div className="mt-1 text-muted-foreground">Text that needed correction</div>
        </div>
      </div>
    </div>
  );
}

export function HelpDoc() {
  return (
    <div className="space-y-6">
      <Legend />
      <MiniMarkdown source={HELP_MD} />
    </div>
  );
}
