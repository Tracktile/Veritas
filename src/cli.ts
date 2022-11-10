import { parse } from "ts-command-line-args";

interface ICopyFilesArguments {
  input: string;
  output: string;
  help?: boolean;
}

const args = parse<ICopyFilesArguments>(
  {
    input: {
      type: String,
      alias: "i",
      description:
        "The service from which to generate schema. Your Service should be the files default export.",
    },
    output: {
      type: String,
      alias: "o",
      description: "The output file to write schema to.",
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
  }
);

console.log(args);
