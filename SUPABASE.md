# Lexteriq — Supabase Backend

## Proyecto
- **URL**: https://woqkueabensezxjvlzjr.supabase.co
- **Org**: Ekusmedios (gyunisqjgsncdaixgjcu)
- **Region**: us-east-1
- **Postgres**: 17

## Tablas
| Tabla | Descripción |
|---|---|
| `plans` | Free, Pro, Business, Enterprise |
| `users` | Usuarios con plan, trial, stripe_customer_id |
| `invitations` | Códigos de beta cerrada |
| `trials` | 14 días trial por usuario |
| `analyses` | Historial de videos analizados |
| `youtube_cache` | Caché 2h de YouTube Data API |

## Planes
| Plan | Precio/mes | Análisis/mes | Trial |
|---|---|---|---|
| Free | $0 | 50 | No |
| Pro | $12.99 | 500 | 14 días |
| Business | $39.99 | Ilimitado | 14 días |
| Enterprise | Contacto | Ilimitado | — |

## Beta cerrada
Requiere código de invitación. Activa plan Pro con trial de 14 días automático.

## Pendiente
- [ ] Conectar Google OAuth Client ID en manifest.json
- [ ] Configurar Stripe productos en dashboard
- [ ] Crear primeros códigos de invitación beta
