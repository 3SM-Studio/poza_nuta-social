# ADR-004: shadcn Sidebar owns admin navigation

Date: 2026-09-22. Status: accepted for Admin Platform V2.

## Decision

Replace the custom header/aside/navigation grid with the installed shadcn Sidebar primitives. Group only implemented routes under Analityka (Dashboard), Pozyskanie (Kampanie, Linki i QR, Polecenia) and Ustawienia (Destynacje, Zespół i dostęp). Use native desktop collapse and mobile off-canvas behavior.

## Consequences

The admin shell gains one accessible navigation architecture across breakpoints. Empty placeholder routes are not created. Poza Nutą remains the product name; “Admin” is context, not a second brand.
