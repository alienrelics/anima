# Anima — install guide (for a friend)

Anima gives Claude Code (the AI assistant you use in VS Code) different
**personalities**. Each personality changes how Claude *writes*, and can read
its replies *out loud* in a voice you choose (Thai, English, and more).

## Install
1. Double-click **Anima-Setup-0.1.0.exe**.
2. Windows may say "unknown publisher" (the app is not code-signed). Click
   **More info → Run anyway**. It is safe; it is just not paid-signed yet.
3. Choose a folder and finish. Anima opens and tucks into your system tray
   (the little icons by the clock). Closing the window just hides it there.

## Use it
- Each card is a personality. Click a card to make it **ACTIVE**.
- **Chat** switch = changes how Claude types. **Voice** switch = reads replies
  out loud.
- Make your own: click the **+ New personality** tile, start from a preset,
  tweak the name / voice / style, and press **Test voice**.

## Connect it to Claude (for the typing part)
You need Claude Code installed in VS Code.
1. In Anima, open **Settings** (the gear), then **Connect to Claude Code**.
2. It shows exactly what it will change, and backs up your settings first.
   Press **Confirm**.
3. Restart Claude Code. Now the active personality types as itself, and speaks
   if its Voice switch is on. Switch cards anytime; it changes on the next message.

## Share a personality
- Open a character (pencil) → **Export** → send the small `.anima` file.
- **Import** (top of the deck) → pick a `.anima` file someone sent you.

## Good to know
- The out-loud voice uses a free Microsoft voice service, so it needs internet.
- Keep Anima running (it stays in the tray) for the voice to work.
- "Start Anima when my PC turns on" is in Settings, so it is always ready.
