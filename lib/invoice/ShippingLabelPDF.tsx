import "server-only";

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Order, ShippingAddress } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#111111", fontFamily: "Helvetica" },
  box: { borderWidth: 2, borderColor: "#111111", borderStyle: "solid", padding: 20 },
  fromLine: { fontSize: 9, color: "#6B7280", marginBottom: 4 },
  brand: { fontSize: 14, fontWeight: 700, marginBottom: 16 },
  sectionTitle: { fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  toBlock: { marginTop: 8 },
  name: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  line: { marginBottom: 2 },
  divider: { borderTop: "1 solid #E5E7EB", marginVertical: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  metaLabel: { color: "#6B7280" },
  metaValue: { fontWeight: 700 },
  trackingBlock: { marginTop: 16, alignItems: "center" },
  trackingNumber: { fontSize: 20, fontWeight: 700, letterSpacing: 2 },
});

export interface ShippingLabelProps {
  order: Order;
  address: ShippingAddress | null;
}

// One order's label body, no <Document> wrapper -- see InvoicePDF.tsx's
// InvoicePage for why (one shared <Document> for both the single-order and
// bulk renderers, since @react-pdf/renderer needs exactly one per PDF).
function ShippingLabelPage({ order, address }: ShippingLabelProps) {
  return (
      <Page size="A6" style={styles.page}>
        <View style={styles.box}>
          <Text style={styles.fromLine}>From: TrendyMall</Text>
          <Text style={styles.brand}>TrendyMall</Text>

          <View style={styles.toBlock}>
            <Text style={styles.sectionTitle}>Deliver To</Text>
            <Text style={styles.name}>{order.customer_name}</Text>
            <Text style={styles.line}>{order.customer_phone}</Text>
            {address ? (
              <Text style={styles.line}>
                {address.street}, {address.city}, {address.district}
                {address.postal_code ? ` ${address.postal_code}` : ""}
              </Text>
            ) : (
              <Text style={styles.line}>{order.shipping_address}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order</Text>
            <Text style={styles.metaValue}>{order.order_number}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Courier</Text>
            <Text style={styles.metaValue}>{order.courier ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment</Text>
            <Text style={styles.metaValue}>
              {order.payment_method === "cod" ? "Cash on Delivery" : "Prepaid"}
            </Text>
          </View>

          <View style={styles.trackingBlock}>
            <Text style={styles.sectionTitle}>Tracking Number</Text>
            <Text style={styles.trackingNumber}>{order.tracking_number ?? "—"}</Text>
          </View>
        </View>
      </Page>
  );
}

function ShippingLabelDocument({ labels }: { labels: ShippingLabelProps[] }) {
  return (
    <Document>
      {labels.map((props, i) => (
        <ShippingLabelPage key={props.order.id ?? i} {...props} />
      ))}
    </Document>
  );
}

export async function renderShippingLabelPdfBatch(labels: ShippingLabelProps[]): Promise<Buffer> {
  return renderToBuffer(<ShippingLabelDocument labels={labels} />);
}

export async function renderShippingLabelPdf(props: ShippingLabelProps): Promise<Buffer> {
  return renderShippingLabelPdfBatch([props]);
}
