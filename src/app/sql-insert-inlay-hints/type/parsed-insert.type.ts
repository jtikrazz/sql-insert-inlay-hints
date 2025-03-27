export type ParsedInsert = {
  columns: string[];
  valueRows: {
    values: string[];
    position: number;
  }[];
};
