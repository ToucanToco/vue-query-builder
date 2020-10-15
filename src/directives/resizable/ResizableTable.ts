/*
 * Create handlers for each table header cols to enable resize
 */

import ResizableColHandler, { ResizableColHandlerOptions } from './ResizableColHandler';

export const DEFAULT_OPTIONS: ResizableTableOptions = {
  classes: {
    table: 'table--resizable',
    handler: 'table__handler',
  },
};

export interface ResizableTableOptions {
  classes: {
    table: string; // class applied to table
    handler: string; // class applied to col handler
  };
}

export default class ResizableTable {
  table: HTMLElement;
  cols: HTMLCollection;
  colHandlers: ResizableColHandler[];
  options: ResizableTableOptions;

  constructor(table: HTMLElement, customOptions?: ResizableTableOptions) {
    this.options = customOptions || DEFAULT_OPTIONS;
    this.table = table;
    this.colHandlers = [];
    this.cols = this.getCols(table);
    this.setColHandlers();
    this.addTableClass();
  }

  destroy(): void {
    this.colHandlers.forEach((colHandler: ResizableColHandler) => colHandler.destroy());
    this.colHandlers = [];
  }

  // Get ths of current table in DOM
  getCols(table: HTMLElement): HTMLCollection {
    const rows: HTMLCollection = table.getElementsByTagName('tr');
    return rows[0].children;
  }

  // apply default style and add handler to each DOM col
  setColHandlers(): void {
    this.destroy(); // remove all previous handlers before adding new ones
    for (const col of this.cols) {
      const colElement = col as HTMLElement;
      // there is sometimes an issue with small table that is solved by adding width to col (otherwise min-width is not set correctly)
      colElement.style.width = `${colElement.offsetWidth}px`;
      // minWidth override maxWidth css property so we use it to expand table and cols without having to touch to table width
      colElement.style.minWidth = `${colElement.offsetWidth}px`;

      const colHandlerOptions: ResizableColHandlerOptions = {
        height: this.table.offsetHeight,
        minWidth: colElement.offsetWidth,
        className: this.options.classes.handler,
      };
      const colHandler: ResizableColHandler = new ResizableColHandler(colHandlerOptions);
      // add the handler to referent DOM col
      col.appendChild(colHandler.render());
      this.colHandlers.push(colHandler);
    }
  }

  addTableClass(): void {
    this.table.classList.add(this.options.classes.table);
  }
}