import {
  Component,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { load, dump } from 'js-yaml';
import { ErrorModalComponent } from './error-modal/error-modal';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, ErrorModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'YAML Editor';
  yamlContent: string = '';
  parsedData: any = null;
  yamlUrl: string = '';
  loadedFileName: string | null = null;
  errorMessage: string = '';
  showErrorModal: boolean = false;
  editingKey: string | null = null;
  addRowMenuData: any = null;

  @ViewChild('editorCard') editorCard!: ElementRef;

  constructor(private cdr: ChangeDetectorRef) {}

  get isLoadButtonDisabled(): boolean {
    return !this.yamlUrl || !this.isValidUrl(this.yamlUrl);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  hideError(): void {
    this.showErrorModal = false;
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      this.loadedFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.yamlContent = reader.result as string;
        this.parseYaml();
        element.value = '';
        this.scrollToEditorCard();
      };
      reader.readAsText(file);
    }
  }

  async loadFromUrl(): Promise<void> {
    if (this.isLoadButtonDisabled) {
      return;
    }
    try {
      this.loadedFileName = this.yamlUrl.substring(
        this.yamlUrl.lastIndexOf('/') + 1
      );
      const response = await fetch(this.yamlUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.yamlContent = await response.text();
      this.parseYaml();
      this.scrollToEditorCard();
    } catch (error) {
      console.error('Error loading from URL:', error);
      this.showError('Failed to load YAML from URL. See console for details.');
    }
  }

  parseYaml(): void {
    try {
      this.parsedData = load(this.yamlContent);
    } catch (e) {
      console.error(e);
      this.showError('Error parsing YAML. See console for details.');
      this.parsedData = null;
    }
  }

  saveYaml(): void {
    if (!this.parsedData) {
      this.showError('No data to save.');
      return;
    }
    try {
      const yamlString = dump(this.parsedData);
      const blob = new Blob([yamlString], { type: 'text/yaml;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      let fileName = this.loadedFileName || 'edited.yaml';
      const lastDotIndex = fileName.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        fileName =
          fileName.substring(0, lastDotIndex) +
          '_edited' +
          fileName.substring(lastDotIndex);
      } else {
        fileName += '_edited';
      }
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error(e);
      this.showError('Error converting data to YAML. See console for details.');
    }
  }

  toggleAddRowMenu(data: any): void {
    if (this.addRowMenuData === data) {
      this.addRowMenuData = null;
    } else {
      this.addRowMenuData = data;
    }
  }

  addRow(type: string): void {
    if (!this.addRowMenuData) {
      return;
    }
    let newKey = 'new_key';
    let counter = 1;
    while (this.addRowMenuData.hasOwnProperty(newKey)) {
      newKey = `new_key_${counter++}`;
    }
    let newValue: any;
    switch (type) {
      case 'string':
        newValue = 'new_value';
        break;
      case 'number':
        newValue = 0;
        break;
      case 'boolean':
        newValue = false;
        break;
      case 'object':
        newValue = {};
        break;
    }
    this.addRowMenuData[newKey] = newValue;
    this.addRowMenuData = null;
    this.cdr.detectChanges();
  }

  removeRow(data: any, key: string): void {
    delete data[key];
    this.cdr.detectChanges();
  }

  setEditingKey(key: string): void {
    this.editingKey = key;
  }

  onKeyEdit(event: Event, oldKey: string, data: any): void {
    this.editingKey = null;
    const newKey = (event.target as HTMLInputElement).value;
    if (newKey !== oldKey) {
      if (data.hasOwnProperty(newKey)) {
        this.showError(`Key "${newKey}" already exists.`);
        (event.target as HTMLInputElement).value = oldKey;
      } else {
        data[newKey] = data[oldKey];
        delete data[oldKey];
        this.cdr.detectChanges();
      }
    }
  }

  closeForm(): void {
    this.parsedData = null;
    this.yamlContent = '';
    this.yamlUrl = '';
    this.loadedFileName = null;
  }

  private scrollToEditorCard(): void {
    setTimeout(() => {
      if (this.editorCard) {
        this.editorCard.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 0);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  trackByFn(index: number, item: string): string {
    return item;
  }
}
