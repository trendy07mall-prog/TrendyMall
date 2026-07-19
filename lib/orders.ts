"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { initiatePayment } from "@/lib/payment";

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export interface CreateOrderResult {
  orderId?: string;
  error?: string;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to place an order." };
  }
  if (input.items.length === 0) {
    return { error: "Your cart is empty." };
  }

  const total = input.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      shipping_address: input.shippingAddress,
      total,
    })
    .select()
    .single();

  if (orderError || !order) {
    return { error: orderError?.message ?? "Could not create order." };
  }

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.name,
    unit_price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    return { error: itemsError.message };
  }

  await initiatePayment({ id: order.id, total });

  revalidatePath("/account/orders");
  return { orderId: order.id };
}
