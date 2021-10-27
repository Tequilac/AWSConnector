import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

import { IDisposable } from '@lumino/disposable';

import { ServerConnection } from '@jupyterlab/services';

import { URLExt } from '@jupyterlab/coreutils';

export class AWSConnectorExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  dialog: HTMLDialogElement;

  dialogOpened: boolean;

  credentials: string;

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    this.dialogOpened = false;

    const toolbarButton = new ToolbarButton({
      label: 'AWS Connector',
      onClick: () => this.openDialog()
    });

    panel.toolbar.addItem('connectorButton', toolbarButton);

    this.addIconLink('close');
    this.addIconLink('info');

    return toolbarButton;
  }

  addIconLink(name: string): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://css.gg/' + name + '.css';
    document.body.appendChild(link);
  }

  async sendGetRequest(): Promise<void> {
    const settings = ServerConnection.makeSettings({});
    const serverResponse = await ServerConnection.makeRequest(
      URLExt.join(settings.baseUrl, '/AWSConnector'),
      { method: 'GET' },
      settings
    );
    const response = await serverResponse.json();
    this.setCredentials(response['data']);
  }

  async sendSetRequest(): Promise<void> {
    const settings = ServerConnection.makeSettings({});
    const serverResponse = await ServerConnection.makeRequest(
      URLExt.join(settings.baseUrl, '/AWSConnector'),
      { method: 'PUT', body: JSON.stringify({ data: this.credentials }) },
      settings
    );
    console.log(serverResponse.text());
  }

  setCredentials(creds: string): void {
    this.credentials = creds;
    this.setData();
  }

  openDialog(): void {
    console.log('Opening dialog');

    if (!this.dialogOpened) {
      console.log(this.credentials);

      console.log('Opening...');
      this.dialog = document.createElement('dialog');
      this.dialog.innerHTML = `
        <h1 id="dialog-title">Configure environment</h1>
        <button type="button" class="action-button" id="close-button">
          <img src="./res/close.svg" alt="Close">
        </button>
        <form id="creds-form">
					<label>Credentials</label>
					<button type="button" class="action-button">
					  <img src="./res/info.svg" alt="Info">
					</button>
					<a href="#" id="creds-more">
						 more...
					</a>
					<div id="creds-desc">
						<p>
							AWS security credentials are used to verify whether you have permission to access the requested resources.
						</p>
					</div>
					<textarea cols="65" rows="8" id="creds" name="creds"></textarea><br><br>
					<button type="button" class="connector-button" id="load-btn">
					  Search for local credentials
          </button>
					<button type="button" class="connector-button" id="submit-btn">
					  Save
					</button>
        </form>
			`;

      this.dialog.id = 'connector-dialog';
      this.dialog.classList.add('connector-dialog-desc-hidden');

      document.body.appendChild(this.dialog);

      document
        .getElementById('close-button')
        .addEventListener('click', () => this.closeDialog());

      document
        .getElementById('creds-more')
        .addEventListener('click', () => this.toggleMore('creds-desc'));

      document
        .getElementById('load-btn')
        .addEventListener('click', () => this.loadData());

      document
        .getElementById('submit-btn')
        .addEventListener('click', () => this.submitData());

      this.setData();

      this.dialog.show();
      this.dialogOpened = true;
    }
  }

  loadData(): void {
    this.sendGetRequest();
  }

  setData(): void {
    if (this.credentials) {
      (<HTMLInputElement>document.getElementById('creds')).value =
        this.credentials;
    }
  }

  saveData(): void {
    this.credentials = (<HTMLInputElement>(
      document.getElementById('creds')
    )).value;
  }

  submitData(): void {
    this.saveData();

    if (this.credentials.trim() !== '') {
      this.sendSetRequest();
    }

    console.log(this.credentials);

    this.closeDialog();
  }

  toggleMore(id: string): void {
    const element = document.getElementById(id);
    const display = getComputedStyle(element).display;
    if (display === 'block') {
      document.getElementById(id).style.display = 'none';
      this.dialog.classList.replace(
        'connector-dialog-desc-shown',
        'connector-dialog-desc-hidden'
      );
    } else if (display === 'none') {
      document.getElementById(id).style.display = 'block';
      this.dialog.classList.replace(
        'connector-dialog-desc-hidden',
        'connector-dialog-desc-shown'
      );
    }
  }

  closeDialog(): void {
    this.saveData();

    console.log('Closing...');
    if (this.dialogOpened) {
      document.body.removeChild(document.getElementById('connector-dialog'));
      this.dialogOpened = false;
    }
  }
}

/**
 * Initialization data for the AWSConnector extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'AWSConnector:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension AWSConnector is activated!');
    const connectorExtension = new AWSConnectorExtension();
    app.docRegistry.addWidgetExtension('Notebook', connectorExtension);
  }
};

export default extension;
