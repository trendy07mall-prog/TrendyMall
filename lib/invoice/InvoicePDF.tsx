import "server-only";

import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatPrice } from "@/lib/utils";
import { describeDeliveryFee } from "@/lib/delivery-fee";
import { PAYMENT_STATUS_LABELS } from "@/components/order/PaymentStatusBadge";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { Order, OrderItem, ShippingAddress } from "@/types";

const LOGO_PATH = path.join(process.cwd(), "public/images/logo/trendymall-logo.png");

// order_number → invoice number is a deterministic derivation, not a
// separately-issued sequence — see the Phase 5 plan for why.
function invoiceNumberFor(orderNumber: string): string {
  return orderNumber.replace(/^TM-/, "INV-");
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#111111", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 64, height: 38 },
  metaBlock: { alignItems: "flex-end" },
  metaLine: { fontSize: 10, marginBottom: 2 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  col: { width: "48%" },
  line: { marginBottom: 2 },
  table: { marginTop: 20, borderTop: "1 solid #E5E7EB" },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1 solid #E5E7EB", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #F3F4F6", paddingVertical: 6 },
  colName: { width: "50%" },
  colQty: { width: "15%", textAlign: "right" },
  colPrice: { width: "17.5%", textAlign: "right" },
  colSubtotal: { width: "17.5%", textAlign: "right" },
  headerCell: { fontSize: 9, color: "#6B7280", textTransform: "uppercase" },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginBottom: 4 },
  totalsLabel: { color: "#6B7280" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginTop: 6, paddingTop: 6, borderTop: "1 solid #111111" },
  grandTotalLabel: { fontWeight: 700 },
  grandTotalValue: { fontWeight: 700 },
  footer: { marginTop: 40, fontSize: 8, color: "#9CA3AF", textAlign: "center" },
});

export interface InvoiceProps {
  order: Order;
  items: OrderItem[];
  address: ShippingAddress | null;
}

function InvoiceDocument({ order, items, address }: InvoiceProps) {
  const deliveryLabel =
    order.delivery_method === "pickup"
      ? "Store Pickup"
      : address
        ? `Delivery (${describeDeliveryFee({ district: address.district, postalCode: address.postal_code, deliveryMethod: "standard" }).reason})`
        : "Delivery";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            {/* The wordmark is baked into this logo image — no separate
              "TrendyMall" text needed alongside it.
              @react-pdf/renderer's <Image>, not next/image or <img> —
              its Image has no alt prop; jsx-a11y can't tell the two apart. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_PATH} style={styles.logo} />
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>Invoice {invoiceNumberFor(order.order_number)}</Text>
            <Text style={styles.metaLine}>Order {order.order_number}</Text>
            <Text style={styles.metaLine}>{new Date(order.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.line}>{order.customer_name}</Text>
            <Text style={styles.line}>{order.customer_email}</Text>
            <Text style={styles.line}>{order.customer_phone}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>
              {order.delivery_method === "pickup" ? "Pickup" : "Shipping Address"}
            </Text>
            {address ? (
              <Text style={styles.line}>
                {address.street}, {address.city}, {address.district}
                {address.postal_code ? ` ${address.postal_code}` : ""}
              </Text>
            ) : (
              <Text style={styles.line}>{order.shipping_address}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <Text style={styles.line}>
                {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Payment Status</Text>
              <Text style={styles.line}>{PAYMENT_STATUS_LABELS[order.payment_status]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, styles.colName]}>Item</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerCell, styles.colPrice]}>Price</Text>
            <Text style={[styles.headerCell, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>
                {item.product_name}
                {item.variant_name ? ` (${item.variant_name})` : ""}
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatPrice(item.unit_price)}</Text>
              <Text style={styles.colSubtotal}>{formatPrice(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{deliveryLabel}</Text>
            <Text>
              {order.delivery_method === "pickup" ? "Store Pickup" : formatPrice(order.shipping_fee)}
            </Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text>-{formatPrice(order.discount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Order status: {ORDER_STATUS_LABELS[order.order_status]} · TrendyMall · trendy07mall@gmail.com
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(props: InvoiceProps): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument {...props} />);
}
