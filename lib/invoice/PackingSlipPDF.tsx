import "server-only";

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Order, OrderItem } from "@/types";

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
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>TrendyMall — Packing Slip</Text>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>Order {order.order_number}</Text>
            <Text style={styles.metaLine}>{new Date(order.created_at).toLocaleDateString()}</Text>
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
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>
                {item.product_name}
                {item.variant_name ? ` (${item.variant_name})` : ""}
                {(item.attribute_selections as { attributeName: string; value: string }[] | null)
                  ?.length
                  ? ` (${(item.attribute_selections as { attributeName: string; value: string }[])
                      .map((s) => `${s.attributeName}: ${s.value}`)
                      .join(", ")})`
                  : ""}
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
            </View>
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
