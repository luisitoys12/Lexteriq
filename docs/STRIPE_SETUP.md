# Lexteriq — Stripe Setup Guide

## Productos creados en Stripe

| Producto | ID | Precio Mensual | Precio Anual |
|---|---|---|---|
| Lexteriq Pro | `prod_UmHOlnyHrwZ3F2` | $9.99/mes (`price_1TmipuHNJduuEGube7oqZDwi`) | $89.99/año (`price_1Tmiq3HNJduuEGubcXxpL8CR`) |
| Lexteriq Business | `prod_UmHOUVlLRKv4zB` | $29.99/mes (`price_1TmiqAHNJduuEGub27cdZt8s`) | $287.99/año (`price_1TmiqHHNJduuEGuba4mzAlef`) |

## Cupón Beta

- **ID:** `CjJO3o5c`
- **Nombre:** Lexteriq Beta Launch
- **Descuento:** 50% off por 3 meses
- **Usos máximos:** 100

## Códigos de Promoción Beta

Registra estos códigos manualmente en el [Stripe Dashboard](https://dashboard.stripe.com/coupons) sobre el cupón `CjJO3o5c`:

| Código | Descripción | Usos máx |
|---|---|---|
| `LEXBETA2026` | Principal lanzamiento beta | 20 |
| `LEXEARLYBIRD` | Early adopters primera ola | 15 |
| `KUSCREATOR` | Comunidad Kusmedios exclusivo | 10 |
| `LEXVIP2026` | VIP acceso exclusivo | 5 |
| `LEXFRIENDS` | Amigos y familia del founder | 10 |

## Variables de Entorno Requeridas

En tu proyecto Supabase, agrega estas secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deploy de Edge Functions

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

## Configurar Webhook en Stripe

1. Ve a [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Agrega endpoint: `https://TU_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
3. Selecciona eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copia el **Signing secret** (`whsec_...`) y agrégalo como secret de Supabase

## Probar Localmente

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escuchar webhooks locales
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger un evento de prueba
stripe trigger customer.subscription.created
```
