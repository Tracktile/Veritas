#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { parse } from "ts-command-line-args";

import { generate } from "./generate";

interface ICopyFilesArguments {
  input: string;
  output: string;
  yaml?: boolean;
  json?: boolean;
  help?: boolean;
}

const fatal = (message: string) => {
  console.error(`[X] ${message}`);
  process.exit(1);
};

const warn = (message: string) => {
  console.warn(`[!] ${message}`);
};

const processArgs = () => {
  try {
    const args = parse<ICopyFilesArguments>(
      {
        input: {
          type: String,
          alias: "i",
          description: "The service from which to generate schema. Your Service should be the files default export.",
        },
        output: {
          type: String,
          alias: "o",
          description: "The output file to write schema to.",
        },
        yaml: {
          type: Boolean,
          alias: "y",
          description: "Output schema as YAML",
          optional: true,
        },
        json: {
          type: Boolean,
          alias: "j",
          description: "Output schema as JSON",
          optional: true,
        },
        help: {
          type: Boolean,
          optional: true,
          alias: "h",
          description: "Displays this useful screen!",
        },
      },
      {
        helpArg: "help",
        headerContentSections: [
          {
            header: "Veritas",
            content: "Batteries included, but like.. watch batteries.",
          },
        ],
      },
    );
    if (args.yaml && args.json) {
      fatal("Both --yaml and --json were passed, choose one.");
    }
    if (!args.yaml && !args.json) {
      warn("Neither --yaml or --json arguments provided, defauling output to YAML. ");
      args.yaml = true;
    }

    if (args.json && !args.output.endsWith(".json")) {
      args.output = `${args.output}.json`;
    }

    if (args.yaml && !args.output.endsWith(".yaml")) {
      args.output = `${args.output}.yaml`;
    }

    args.input = path.resolve(process.cwd(), args.input);
    args.output = path.resolve(process.cwd(), args.output);
    return args;
  } catch (err) {
    if (err instanceof Error) {
      console.error(err);
      return fatal(err.message);
    }
    return fatal("Error encountered while process arguments.");
  }
};

async function main() {
  try {
    const args = processArgs();
    const { default: service } = await import(args.input);
    const content = await generate(service, {
      format: args.json ? "json" : "yaml",
    });
    fs.writeFileSync(args.output, content, { encoding: "utf8" });
    process.exit(0);
  } catch (err) {
    if (err instanceof Error) {
      console.error(err);
      fatal(err.message);
    }
    fatal("Something has gone terribly wrong.");
  }
}

main();
