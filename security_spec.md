# Security Specification - Abracadabra Ludoteca

## Data Invariants
- Una prenotazione deve avere una data valida, una sala valida e una fascia oraria valida.
- Non possono esserci due prenotazioni per la stessa sala nello stesso slot della stessa giornata (gestito lato client/server via logic, ma protetto da rules).
- I dati di contatto (telefono) devono essere visibili solo agli amministratori.

## Access Control
- **Public (Anonymous)**:
  - Può leggere tutte le prenotazioni (per vedere la disponibilità).
  - Può creare una nuova prenotazione.
  - NON può modificare o eliminare prenotazioni esistenti.
- **Admin**:
  - Può leggere, creare, modificare ed eliminare qualsiasi prenotazione.

## The Dirty Dozen Payloads (Rejection Targets)
1. Prenotazione con nome bambino vuoto.
2. Prenotazione con età negativa o > 18.
3. Prenotazione con sala non esistente.
4. Prenotazione con slot non valido.
5. Modifica di una prenotazione da parte di un utente non autenticato.
6. Eliminazione di una prenotazione da parte di un utente non autenticato.
7. Iniezione di campi extra (es. `isVerified: true`).
8. Prenotazione con data nel passato (opzionale, ma consigliato).
9. ID documento non valido (caratteri speciali proibiti).
10. Payload di dimensioni eccessive (nomi lunghi 1MB).
11. Tentativo di cambiare il `createdAt` dopo la creazione.
12. Lettura di dati PII da parte di utenti non autorizzati (se decidessimo di nascondere il telefono ai pubblici). *Nota: Per ora il cliente ha chiesto che vedano chi è impegnato, ma il telefono dovrebbe restare privato.*

## Admin Identity
- L'utente `gecolakey@gmail.com` è considerato amministratore.
