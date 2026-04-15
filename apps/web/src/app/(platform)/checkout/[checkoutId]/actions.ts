"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cinemas, concessions } from "@/lib/storefront/data";
import { getMovieById, getSessionById } from "@/lib/storefront/service";

const checkoutSchema = z.object({
  sessionId: z.string().min(1),
  customerName: z.string().min(3),
  customerEmail: z.string().email(),
  fiscalCpf: z
    .string()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, "") : "")),
  paymentMethod: z.enum(["pix", "card", "wallet"]),
  ticketQuantities: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? z.record(z.string(), z.number().int().min(0)).parse(JSON.parse(value))
        : {},
    ),
  courtesyCode: z.string().optional(),
  cardNumber: z
    .string()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, "") : "")),
  cardExpiry: z.string().optional(),
  cardCvv: z
    .string()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, "") : "")),
  seatIds: z.string().transform((value) => z.array(z.string()).parse(JSON.parse(value))),
  productQuantities: z
    .string()
    .transform((value) =>
      z.record(z.string(), z.number().int().min(0)).parse(JSON.parse(value)),
    ),
}).superRefine((data, ctx) => {
  if (data.fiscalCpf && data.fiscalCpf.length !== 11) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CPF inválido para nota fiscal.",
      path: ["fiscalCpf"],
    });
  }

  if (data.paymentMethod !== "card") {
    return;
  }

  if (!data.cardNumber || data.cardNumber.length < 13 || data.cardNumber.length > 19) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número do cartão inválido.",
      path: ["cardNumber"],
    });
  }

  if (!data.cardExpiry || !/^\d{2}\/\d{2}$/.test(data.cardExpiry)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Validade do cartão inválida.",
      path: ["cardExpiry"],
    });
  } else {
    const [month] = data.cardExpiry.split("/");
    const monthNumber = Number(month);
    if (monthNumber < 1 || monthNumber > 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Validade do cartão inválida.",
        path: ["cardExpiry"],
      });
    }
  }

  if (!data.cardCvv || data.cardCvv.length < 3 || data.cardCvv.length > 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CVV inválido.",
      path: ["cardCvv"],
    });
  }
});

export async function submitCheckout(
  _state: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = checkoutSchema.safeParse({
    sessionId: formData.get("sessionId"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    fiscalCpf: formData.get("fiscalCpf"),
    paymentMethod: formData.get("paymentMethod"),
    ticketQuantities: formData.get("ticketQuantities"),
    courtesyCode: formData.get("courtesyCode"),
    cardNumber: formData.get("cardNumber"),
    cardExpiry: formData.get("cardExpiry"),
    cardCvv: formData.get("cardCvv"),
    seatIds: formData.get("seatIds"),
    productQuantities: formData.get("productQuantities"),
  });

  if (!parsed.success) {
    return { error: "Revise seus dados antes de confirmar a compra." };
  }

  if (!parsed.data.seatIds.length) {
    return { error: "Selecione ao menos um assento para continuar." };
  }

  const session = await getSessionById(parsed.data.sessionId);
  const movie = session ? await getMovieById(session.movieId) : null;
  const cinema = session ? cinemas.find((item) => item.id === session.cinemaId) : null;

  if (!session || !movie || !cinema) {
    return { error: "Sua sessão mudou de estado. Volte e escolha novamente." };
  }

  const products = Object.entries(parsed.data.productQuantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => {
      const product = concessions.find((item) => item.id === productId);
      return product ? { ...product, quantity } : null;
    })
    .filter((product): product is (typeof concessions)[number] & { quantity: number } => product !== null);

  const orderId = `order-${Date.now()}`;

  const total =
    parsed.data.seatIds.length * session.priceFrom +
    products.reduce((sum, product) => sum + product.price * product.quantity, 0);

  const ticketPayload = {
    orderId,
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail,
    paymentMethod:
      parsed.data.paymentMethod === "pix"
        ? "PIX instantâneo"
        : parsed.data.paymentMethod === "card"
          ? "Cartão de crédito"
          : "Apple / Google Wallet",
    movieTitle: movie.title,
    cinemaName: cinema.name,
    showtimeLabel: `${session.date} • ${session.time} • ${session.room}`,
    seatIds: parsed.data.seatIds,
    ticketQuantities: parsed.data.ticketQuantities,
    courtesyCode: parsed.data.courtesyCode,
    total,
    qrCode: "FRAME24-QR-DEMO",
    walletUrl: "#wallet",
    barcode: `${orderId.toUpperCase()}-${parsed.data.seatIds.join("")}`,
  };

  (await cookies()).set("frame24-last-order", JSON.stringify(ticketPayload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(`/pedido/${orderId}`);
}
