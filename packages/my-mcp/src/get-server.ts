import { log } from 'node:console'
import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
// import * as fs from "fs/promises";
// import * as path from "path";

import { promises as fs } from "fs";
import path from "path";
import { Ajv } from "ajv";

const ajv = new Ajv();

export function getServer () {
  // Create an MCP server
  const server = new McpServer({
    name: 'demo-server',
    version: '1.0.0',
  })

  process.stderr.write('Registering tools and resources...\n')

  // Add an addition tool
  server.registerTool(
    'add',
    z.object({
      title: 'Addition Tool',
      description: 'Add two numbers',
      inputSchema: {
        a: z.number(),
        b: z.number(),
      },
    }),
    ({ a, b }) => {
      process.stderr.write(`[TOOL] add called with a=${a}, b=${b}\n`)
      const result = a + b
      process.stderr.write(`[TOOL] add returning: ${result}\n`)
      return {
        content: [{ type: 'text', text: String(result) }],
      }
    }
  )

  // Add a dynamic greeting resource
  server.registerResource(
    'greeting',
    new ResourceTemplate('greeting://{name}', { list: undefined }),
    {
      title: 'Greeting Resource', // Display name for UI
      description: 'Dynamic greeting generator',
    },
    (uri, { name }) => {
      log(`greeting resource callback invoked for ${uri}, name ${name}}`)
      return {
        contents: [
          {
            uri: uri.href,
            text: `Hello, ${name}!`,
          },
        ],
      }
    }
  )

server.registerResource(
  "acceptance-criteria-validator",
  new ResourceTemplate("acceptance-criteria://{ticketId}", { list: undefined }),
  {
    title: "Acceptance Criteria Validator",
    description: "Validates actual acceptance criteria against story.schema.json",
  },
  async (uri, { body }) => {
    try {
      // Load the schema file from resources directory
      const filePath = path.join(process.cwd(), "resources", "story.schema.json");
      const schemaText = await fs.readFile(filePath, "utf-8");
      const schema = JSON.parse(schemaText);

      // Compile schema
      const validate = ajv.compile(schema);

      // Parse body to get actual criteria
      const criteriaInput = typeof body === "string" ? JSON.parse(body) : body;

      const valid = validate(criteriaInput);

      if (valid) {
        return {
          contents: [
            {
              uri: uri.href,
              text: "✅ Acceptance Criteria are valid.",
            },
          ],
        };
      } else {
        const errorText = ajv.errorsText(validate.errors);
        return {
          contents: [
            {
              uri: uri.href,
              text: `❌ Validation failed:\n${errorText}`,
            },
          ],
        };
      }
    } catch (err) {
      console.error("Validation error:", err);
      return {
        contents: [
          {
            uri: uri.href,
            text: `❌ Error processing request: ${err.message}`,
          },
        ],
      };
    }
  }
);


// Register the schema as a static resource from local filesystem
/* server.registerResource(
  "acceptance-criteria-schema",
  new ResourceTemplate("acceptance-criteria://{policy}", { list: undefined }),
  {
    title: "Acceptance Criteria Schema",
    description: "JSON Schema used to validate JIRA ticket acceptance criteria. ",
  },
  async (uri) => {
    try {
      const filePath = path.join(process.cwd(), "resources", "story.schema.json");
      const jsonSchema = await fs.readFile(filePath, "utf-8");

      return {
        contents: [
          {
            uri: uri.href,
            text: jsonSchema,
          },
        ],
      };
    } catch (err) {
      console.error("Failed to read schema file:", err);
      throw err;
    }
  }
); */

  return server
}
