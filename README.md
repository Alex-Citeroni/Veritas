# Veritas

Veritas è un'applicazione web sviluppata con Next.js che permette di creare e gestire sondaggi in tempo reale. Gli utenti registrati possono predisporre le domande, condividere il link di voto e visualizzare i risultati man mano che arrivano.

## Installazione

1. Assicurati di avere **Node.js** installato sul tuo sistema.
2. Installa le dipendenze del progetto:
   ```bash
   npm install
   ```
3. Avvia l'ambiente di sviluppo:
   ```bash
   npm run dev
   ```
   L'app sarà disponibile su `http://localhost:3000`.

## Accesso e registrazione

- Visita la pagina principale e clicca su **"Accedi e crea un sondaggio"**.
- Inserisci uno username: se esiste verrà richiesto di inserire la password, altrimenti potrai crearne una nuova per registrarti.
- Dopo l'autenticazione accederai al pannello **Admin**.

## Creazione di un sondaggio

1. Dal pannello Admin premi **"Nuovo"** per aprire il modulo di creazione.
2. Inserisci il titolo del sondaggio.
3. Aggiungi almeno una domanda e due risposte per ciascuna domanda.
4. Salva il sondaggio: il primo sondaggio creato viene impostato automaticamente come attivo.

## Gestione dei sondaggi

- Nella colonna sinistra del pannello trovi l'elenco dei tuoi sondaggi. Ogni voce può essere attivata, disattivata, modificata o eliminata.
- Solo un sondaggio alla volta può essere **attivo**. Quando ne attivi uno nuovo, quello precedente viene archiviato.
- Attraverso il pulsante **"Live"** puoi visualizzare la pagina pubblica del sondaggio attivo oppure condividerne il link con **"Condividi"**.
- È possibile salvare i risultati correnti cliccando **"Salva Risultati"**: verrà generato un file `.md` nella cartella `results/<username>`.

## Pagina pubblica di voto

- Gli utenti accedono all'indirizzo `/<username>` dove `<username>` corrisponde al proprietario del sondaggio.
- Ogni domanda viene presentata con le relative risposte. Dopo aver votato è possibile vedere in tempo reale l'andamento delle preferenze.
- Le scelte effettuate vengono memorizzate localmente nel browser per evitare voti multipli sulla stessa domanda.

## Struttura dei dati

- I sondaggi creati sono salvati nella cartella `data/<username>/polls` in formato JSON.
- I risultati archiviati si trovano in `results/<username>` e possono essere scaricati o eliminati dal pannello Admin.

## Tecnologie principali

- [Next.js](https://nextjs.org/) per il front‑end e l'API.
- [React](https://react.dev/) per la gestione dell'interfaccia.
- [Tailwind CSS](https://tailwindcss.com/) per lo styling.

Per maggiori dettagli sul codice dai uno sguardo alla cartella `src/`.
