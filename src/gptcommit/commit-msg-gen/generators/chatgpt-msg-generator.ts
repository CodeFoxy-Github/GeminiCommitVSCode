/*
 * This code includes portions of code from the opencommit project, which is
 * licensed under the MIT License. Copyright (c) Dima Sukharev.
 * The original code can be found at https://github.com/di-sukharev/opencommit/blob/master/src/generateCommitMessageFromGitDiff.ts.
 */

import axios from 'axios';
import { trimNewLines } from "@utils/text";
import { Configuration as AppConfiguration } from "@utils/configuration";
import { MsgGenerator } from "./msg-generator";

const initMessagesPrompt: Array<any> = [
  {
    role: "system",
    content: `You are to act as the author of a commit message in git. Your mission is to create clean and comprehensive commit messages in the conventional commit convention. I'll send you an output of 'git diff --staged' command, and you convert it into a commit message. Do not preface the commit with anything, use the present tense. Don't add any descriptions to the commit, only commit message. Use English language to answer.`,
  },
  {
    role: "user",
    content: `diff --git a/src/server.ts b/src/server.ts
    index ad4db42..f3b18a9 100644
    --- a/src/server.ts
    +++ b/src/server.ts
    @@ -10,7 +10,7 @@ import {
      initWinstonLogger();
      
      const app = express();
    -const port = 7799;
    +const PORT = 7799;
      
      app.use(express.json());
      
    @@ -34,6 +34,6 @@ app.use((_, res, next) => {
      // ROUTES
      app.use(PROTECTED_ROUTER_URL, protectedRouter);
      
    -app.listen(port, () => {
    -  console.log(\`Server listening on port \${port}\`);
    +app.listen(process.env.PORT || PORT, () => {
    +  console.log(\`Server listening on port \${PORT}\`);
      });`,
  },
  {
    role: "assistant",
    content: `fix(server.ts): change port variable case from lowercase port to uppercase PORT
        feat(server.ts): add support for process.env.PORT environment variable`,
  },
];

function generateCommitMessageChatCompletionPrompt(diff: string): Array<any> {
  const chatContextAsCompletionRequest = [...initMessagesPrompt];

  chatContextAsCompletionRequest.push({
    role: "user",
    content: diff,
  });

  return chatContextAsCompletionRequest;
}

const defaultModel = "gemini-pro";
const apiKey = config.apiKey; // Replace this with your actual API key
const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${defaultModel}:generateContent?key=${apiKey}`;

export class ChatgptMsgGenerator implements MsgGenerator {
  config?: AppConfiguration["openAI"];

  constructor(config: AppConfiguration["openAI"]) {
    this.config = config;
  }

  async generate(diff: string, delimeter?: string) {
    const messages = generateCommitMessageChatCompletionPrompt(diff);

    try {
      const response = await axios.post(
        apiUrl,
        {
          contents: messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const message = response.data.choices[0].message;
      const commitMessage = message?.content;

      if (!commitMessage) {
        throw new Error("No commit message was generated. Try again.");
      }

      const alignedCommitMessage = trimNewLines(commitMessage, delimeter);
      return alignedCommitMessage;
    } catch (error) {
      console.error("Error generating commit message:", error);
      throw new Error("Failed to generate commit message.");
    }
  }
}
