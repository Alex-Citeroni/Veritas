# Veritas

Veritas è un'applicazione web sviluppata con Next.js che permette di creare e gestire sondaggi interattivi in tempo reale.

Questa guida è divisa in due sezioni: una per gli **utenti** dell'applicazione e una per gli **sviluppatori** che vogliono eseguirla in locale.

---

## Guida per l'Utente

Questa sezione descrive come utilizzare Veritas per creare e gestire i tuoi sondaggi.

### Accesso e Registrazione

1.  Visita la pagina principale e clicca su **"Accedi e crea un sondaggio"**.
2.  Inserisci il tuo username.
    *   **Se l'username esiste**, ti verrà richiesta la password per accedere.
    *   **Se l'username non esiste**, potrai creare una password per registrare un nuovo account.
3.  Una volta autenticato, verrai reindirizzato al pannello di amministrazione (la tua Dashboard).

### La Dashboard Admin

La dashboard è il tuo centro di controllo. È divisa in due pannelli:
*   **A sinistra**: L'elenco di tutti i sondaggi che hai creato.
*   **A destra**: Il modulo per creare un nuovo sondaggio o modificare uno esistente.

Dall'intestazione della dashboard puoi anche accedere alla pagina del tuo profilo per modificare le credenziali.

### Creazione e Modifica di un Sondaggio

*   **Per creare un nuovo sondaggio**: Assicurati di non avere un sondaggio selezionato per la modifica e compila il modulo a destra. Premi **"Nuovo"** in alto a sinistra se il modulo non è visibile.
*   **Per modificare un sondaggio esistente**: Clicca sul pulsante **"Modifica"** di un sondaggio dall'elenco. Il modulo a destra si popolerà con i dati di quel sondaggio.

Quando compili il modulo:
1.  Inserisci un **titolo** per il sondaggio.
2.  Aggiungi almeno una **domanda**.
3.  Per ogni domanda, aggiungi almeno due **risposte**.
4.  Puoi riordinare domande e risposte trascinandole.
5.  Clicca su **"Salva Sondaggio"** (o **"Salva Modifiche"**).

_Nota: il primo sondaggio che crei viene impostato automaticamente come attivo._

### Gestione dei Sondaggi

Dall'elenco a sinistra, per ogni sondaggio puoi:
*   **Attivare**: Rende il sondaggio visibile al pubblico per la votazione. Solo un sondaggio può essere attivo alla volta. L'attivazione di un nuovo sondaggio archivia automaticamente i risultati di quello precedentemente attivo.
*   **Disattivare**: Rimuove il sondaggio dalla pagina pubblica.
*   **Modificare**: Carica i dati del sondaggio nel modulo di modifica.
*   **Eliminare**: Rimuove permanentemente il sondaggio e tutti i suoi risultati archiviati.

### Condivisione e Voto

Per il sondaggio **attivo**, puoi:
*   **Visualizzare la pagina live**: Clicca su **"Live"** per vedere la pagina come la vedranno i votanti.
*   **Condividere il link**: Clicca su **"Condividi"** per copiare l'URL pubblico del tuo sondaggio (es. `https://tua-app.com/tuo-username`).
*   **Votazione**: Chiunque abbia il link può votare. I risultati si aggiornano in tempo reale. Gli utenti possono cambiare il loro voto cliccando su una risposta diversa.

### Gestione dei Risultati

*   **Salvataggio**: Per il sondaggio attivo, clicca su **"Salva Risultati"** per creare un'istantanea dei voti correnti. Questo è utile per archiviare i dati prima di disattivare un sondaggio o fare modifiche.
*   **Download ed Eliminazione**: Ogni sondaggio nell'elenco mostra i suoi risultati archiviati. Da lì puoi scaricare i file dei risultati (in formato Markdown) o eliminarli.

### Gestione del Profilo

Dalla pagina del profilo (accessibile dall'icona utente nella dashboard) puoi:
*   **Cambiare il tuo username**.
*   **Cambiare la tua password**.

---

## Guida per lo Sviluppatore

### Installazione

1.  Assicurati di avere **Node.js** installato sul tuo sistema.
2.  Installa le dipendenze del progetto:
    ```bash
    npm install
    ```
3.  Avvia l'ambiente di sviluppo:
    ```bash
    npm run dev
    ```
    L'app sarà disponibile su `http://localhost:3000`.

### Struttura dei Dati

*   **Utenti**: I dati degli utenti (username e hash della password) sono salvati in `data/<username>/user.json`.
*   **Sondaggi**: I sondaggi creati sono salvati in formato JSON nella cartella `data/<username>/polls`.
*   **Risultati**: I risultati archiviati si trovano in `results/<username>` in formato Markdown.

### Tecnologie Principali

*   [Next.js](https://nextjs.org/) per il front‑end e l'API.
*   [React](https://react.dev/) per la gestione dell'interfaccia.
*   [Tailwind CSS](https://tailwindcss.com/) per lo styling.

Per maggiori dettagli sul codice dai uno sguardo alla cartella `src/`.
