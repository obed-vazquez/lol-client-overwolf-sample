import {
    OWGames,
    OWGamesEvents,
    OWHotkeys
  } from "@overwolf/overwolf-api-ts";
  
  import { AppWindow } from "../AppWindow";
  import { kHotkeys, kWindowNames, kGamesFeatures } from "../consts";
  
  import WindowState = overwolf.windows.WindowStateEx;
  
  // The window displayed in-game while a game is running.
  // It listens to all info events and to the game events listed in the consts.ts file
  // and writes them to the relevant log using <pre> tags.
  // The window also sets up Ctrl+F as the minimize/restore hotkey.
  // Like the background window, it also implements the Singleton design pattern.
  class Desktop extends AppWindow {
    private static _instance: Desktop;
    private _gameEventsListener: OWGamesEvents;
    private _eventsLog: HTMLElement;
    private _infoLog: HTMLElement;
  
    private constructor() {
      super(kWindowNames.desktop);
  
      this._eventsLog = document.getElementById('eventsLog');
      this._infoLog = document.getElementById('infoLog');
  
      this.setToggleHotkeyBehavior();
      this.setToggleHotkeyText();
    }
  
    public static instance() {
      if (!this._instance) {
        this._instance = new Desktop();
      }
  
      return this._instance;
    }
  
    public async run() {
      const gameClassId = await this.getCurrentGameClassId();
  
      const gameFeatures = kGamesFeatures.get(gameClassId);
  
      if (gameFeatures && gameFeatures.length) {
        this._gameEventsListener = new OWGamesEvents(
          {
            onInfoUpdates: this.onInfoUpdates.bind(this),
            onNewEvents: this.onNewEvents.bind(this)
          },
          gameFeatures
        );
  
        this._gameEventsListener.start();
      }
    }
  
    private onInfoUpdates(info: any) {
      this.logLine(this._infoLog, info, false);
    }
  
    // Special events will be highlighted in the event log
    private onNewEvents(e: any) {
      const shouldHighlight = e.events.some(event => {
        switch (event.name) {
          case 'selected_positions':
          case 'champ_select':
          case 'raw':
            return true;
        }
  
        return false
      });
      this.logLine(this._eventsLog, e, shouldHighlight);
    }
  
    // Displays the toggle minimize/restore hotkey in the window header
    private async setToggleHotkeyText() {
      const gameClassId = await this.getCurrentGameClassId();
      const hotkeyText = await OWHotkeys.getHotkeyText(kHotkeys.toggle, gameClassId);
      const hotkeyElem = document.getElementById('hotkey');
      hotkeyElem.textContent = hotkeyText;
    }
  
    // Sets toggleInGameWindow as the behavior for the Ctrl+F hotkey
    private async setToggleHotkeyBehavior() {
      const toggleDesktopWindow = async (
        hotkeyResult: overwolf.settings.hotkeys.OnPressedEvent
      ): Promise<void> => {
        console.log(`pressed hotkey for ${hotkeyResult.name}`);
        const desktopState = await this.getWindowState();
  
        if (desktopState.window_state === WindowState.NORMAL ||
            desktopState.window_state === WindowState.MAXIMIZED) {
          this.currWindow.minimize();
        } else if (desktopState.window_state === WindowState.MINIMIZED ||
            desktopState.window_state === WindowState.CLOSED) {
          this.currWindow.restore();
        }
      }
  
      OWHotkeys.onHotkeyDown(kHotkeys.toggle, toggleDesktopWindow);
    }
  
    // Appends a new line to the specified log
    private logLine(log: HTMLElement, data, highlight) {
      const line = document.createElement('pre');
      line.textContent = JSON.stringify(data);
  
      if (highlight) {
        line.className = 'highlight';
      }
  
      // Check if scroll is near bottom
      const shouldAutoScroll =
        log.scrollTop + log.offsetHeight >= log.scrollHeight - 10;
  
      log.appendChild(line);
  
      if (shouldAutoScroll) {
        log.scrollTop = log.scrollHeight;
      }
    }
  
    private async getCurrentGameClassId(): Promise<number | null> {
      const info = await OWGames.getRunningGameInfo();
  
      return (info && info.classId) ? info.classId : null;
    }
  }
  
  Desktop.instance().run();
  
