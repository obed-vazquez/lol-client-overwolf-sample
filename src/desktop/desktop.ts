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
    var logId = "#Desktop(): ";
    console.info(logId, "Start - constructor");

    this._eventsLog = document.getElementById('eventsLog');
    console.info(logId, "_eventsLog: ", this._eventsLog);
    this._infoLog = document.getElementById('infoLog');
    console.info(logId, "_infoLog: ", this._infoLog);

    this.setToggleHotkeyBehavior();
    this.setToggleHotkeyText();
    console.info(logId, "Finish");
  }

  public static instance() {
    var logId = "#instance(): ";
    console.info(logId, "Start");
    if (!this._instance) {
      this._instance = new Desktop();
    }

    console.info(logId, "Finish");
    return this._instance;
  }

  
  public async run() {
    this.monitorChampSelect();
  }


  public monitorChampSelect() {
    var logId = "#monitorChampSelect(): ";
    console.info(logId, "Start: ");
    const oneSecondInMillis = 1000;
    setInterval(() => {
      var localId = logId + "#setInterval(): ";
      console.info(localId, "Start");
      this.getChampionSelectionStatus();
      console.info(localId, "Finish");
    }, oneSecondInMillis);
    console.info(logId, "Finish");
  }

  public getChampionSelectionStatus() {
    var logId = "#getChampionSelectionStatus(): ";
    console.info(logId, "Start: ");
    const launcherClassId = 10902; // League of Legends launcher class ID you can also call getCurrentGameClassId()
    overwolf.games.launchers.events.getInfo(launcherClassId, (response) => {
      var localId = logId + "#overwolf.games.launchers.events.getInfo(): ";
      console.info(localId, "Start - response: ", response);

      if (!response || !response.res || !response.res.champ_select  || !response.res.champ_select.raw)
        throw new Error("Response is empty! Is the client closed?");
      
      const session = JSON.parse(response.res.champ_select.raw);

      this.logToInfo((session.myTeam && session.myTeam.length>0)?session:"Waiting for the match to start.");

      console.info(localId, "Finish");
    });
  }

  /**
   * Uses the _infoLog view element from the html to print the text to it so the user can monitor the information. 
   * @param text 
   * @param highlight 
   */
  public logToInfo(text: string | Record<string, unknown>, highlight: boolean = false): void {
    var logId = "#displayAtInfo(String|JSON, boolean): ";
    console.info(logId, "Start - text:", text, " highlight:", highlight);

    const textToLog = (typeof text !== 'string')? JSON.stringify(text, null, 2):text;

    const infoLogElement = this._infoLog;
    const preElement = document.createElement('pre');
    preElement.textContent = textToLog;
    if (highlight) preElement.className = 'highlight';
    const shouldAutoScroll =
      infoLogElement.scrollTop + infoLogElement.offsetHeight >= infoLogElement.scrollHeight - 10;
    infoLogElement.innerText = '';
    infoLogElement.appendChild(preElement);
    if (shouldAutoScroll) infoLogElement.scrollTop = infoLogElement.scrollHeight;

    console.info(logId, "Finish");
  }

  // Displays the toggle minimize/restore hotkey in the window header
  private async setToggleHotkeyText() {
    var logId = "#setToggleHotkeyText(): ";
    console.info(logId, "Start");
    const gameClassId = await this.getCurrentGameClassId();
    const hotkeyText = await OWHotkeys.getHotkeyText(kHotkeys.toggle, gameClassId);
    const hotkeyElem = document.getElementById('hotkey');
    hotkeyElem.textContent = hotkeyText;
    console.info(logId, "Finish");
  }

  // Sets toggleInGameWindow as the behavior for the Ctrl+F hotkey
  private async setToggleHotkeyBehavior() {
    var logId = "#setToggleHotkeyBehavior(): ";
    console.info(logId, "Start");
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
    console.info(logId, "Finish");
  }

  private async getCurrentGameClassId(): Promise<number | null> {
    var logId = "#getCurrentGameClassId(): ";
    console.info(logId, "Start");
    const info = await OWGames.getRunningGameInfo();

    const response = (info && info.classId) ? info.classId : null;
    console.info(logId, "Finish - response should be 10902:",response);
    return response;
  }
}

//This is where the thread starts. (main method call)
Desktop.instance().run();

