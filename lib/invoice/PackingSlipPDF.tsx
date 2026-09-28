import "server-only";

import { Fragment } from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Order, OrderItem } from "@/types";
import { formatStoreDate } from "@/lib/datetime";
import { groupBundleRows } from "@/lib/orders/bundle-lines";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#111111", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 14, fontWeight: 700 },
  metaBlock: { alignItems: "flex-end" },
  metaLine: { fontSize: 10, marginBottom: 2 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  line: { marginBottom: 2 },
  table: { marginTop: 20, borderTop: "1 solid #E5E7EB" },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1 solid #E5E7EB", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #F3F4F6", paddingVertical: 8 },
  colName: { width: "75%" },
  colQty: { width: "25%", textAlign: "right" },
  headerCell: { fontSize: 9, color: "#6B7280", textTransform: "uppercase" },
  bundleChildName: { fontSize: 9, color: "#6B7280", paddingLeft: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 6, borderTop: "1 solid #111111" },
  totalLabel: { fontWeight: 700 },
  totalValue: { fontWeight: 700 },
  footer: { marginTop: 40, fontSize: 8, color: "#9CA3AF", textAlign: "center" },
});

export interface PackingSlipProps {
  order: Order;
  items: OrderItem[];
}

// A warehouse pick list, deliberately with no prices/totals — staff
// packing the box don't need pricing information, just what and how many.
function PackingSlipDocument({ order, items }: PackingSlipProps) {
  // What actually goes in the parcel. A bundle's own line is the box,
  // not a fourth object to pack, so it is counted only when it has no
  // contents listed under it -- otherwise its items are counted instead
  // and the bundle line would double the total.
  const groups = groupBundleRows(items);
  const totalItems = groups.reduce(
    (sum, group) =>
      sum +
      (group.contents.length > 0
        ? group.contents.reduce((inner, content) => inner + content.quantity, 0)
        : group.line.quantity),
    0,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>TrendyMall — Packing Slip</Text>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>Order {order.order_number}</Text>
            <Text style={styles.metaLine}>{formatStoreDate(order.created_at)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ship To</Text>
          <Text style={styles.line}>{order.customer_name}</Text>
          <Text style={styles.line}>{order.customer_phone}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, styles.colName]}>Item</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
          </View>
          {/* A bundle prints as its own line with the items inside it
              indented beneath. This is the ONE screen where those lines
              matter most: they are what actually goes in the parcel. The
              bundle line itself is the box; the indented rows are its
              contents, so both are needed to pack it correctly. */}
          {groups.map(({ line: item, contents }) => (
            <Fragment key={item.id}>
              <View style={styles.tableRow}>
                <Text style={styles.colName}>
                  {item.product_name}
                  {item.variant_name ? ` (${item.variant_name})` : ""}
                  {(item.attribute_selections as { attributeName: string; value: string }[] | null)
                    ?.length
                    ? ` (${(item.attribute_selections as { attributeName: string; value: string }[])
                        .map((s) => `${s.attributeName}: ${s.value}`)
                        .join(", ")})`
                    : ""}
                  {contents.length > 0 ? " — bundle, pack the items below" : ""}
                </Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
              </View>
              {contents.map((content) => (
                <View key={content.id} style={styles.tableRow}>
                  <Text style={[styles.colName, styles.bundleChildName]}>
                    {"• "}
                    {content.product_name}
                    {content.variant_name ? ` (${content.variant_name})` : ""}
                  </Text>
                  <Text style={[styles.colQty, styles.bundleChildName]}>{content.quantity}</Text>
                </View>
              ))}
            </Fragment>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Items</Text>
          <Text style={styles.totalValue}>{totalItems}</Text>
        </View>

        <Text style={styles.footer}>TrendyMall · trendy07mall@gmail.com</Text>
      </Page>
    </Document>
  );
}

export async function renderPackingSlipPdf(props: PackingSlipProps): Promise<Buffer> {
  return renderToBuffer(<PackingSlipDocument {...props} />);
}
