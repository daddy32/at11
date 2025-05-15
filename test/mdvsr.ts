// Test for Mdvsr parser

import { Mdvsr } from "../parsers/patronka/mdvsr";
import { IMenuItem } from "../parsers/IMenuItem";

(async () => {
  const parser = new Mdvsr();
  const today = new Date();
  await parser.parse("", today, (menu: IMenuItem[]) => {
    console.log("Parsed menu:", menu);
  });
})();