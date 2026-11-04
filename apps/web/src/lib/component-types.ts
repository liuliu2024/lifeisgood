export type ComponentModule = { id: string; title: string };
export type ComponentToolOption = { key: string; title: string; path: string };
export type ComponentCatalogItem = {
  id: string;
  title: string;
  description: string;
  module_ids: string[];
  sort_order: number;
  hidden?: boolean;
  archived?: boolean;
  kind: "tool" | "candidate";
  tool_key?: string | null;
  path?: string | null;
};
export type ComponentCatalog = {
  revision: number;
  modules: ComponentModule[];
  items: ComponentCatalogItem[];
  tool_options?: ComponentToolOption[];
};
export type ComponentInput = {
  expected_revision: number;
  title: string;
  description: string;
  module_ids: string[];
  sort_order: number;
  hidden: boolean;
  kind: "tool" | "candidate";
  tool_key?: string;
  archived?: boolean;
};
