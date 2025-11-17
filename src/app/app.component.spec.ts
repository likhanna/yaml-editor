import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ErrorModalComponent } from './error-modal/error-modal';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, ErrorModalComponent, FormsModule, CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have the 'YAML Editor' title`, () => {
    expect(component.title).toEqual('YAML Editor');
  });

  it('should render the logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-logo')).toBeTruthy();
  });

  it('should load a YAML file from a local file', (done) => {
    const yamlContent = 'key: value';
    const file = new File([yamlContent], 'test.yaml', { type: 'text/yaml' });
    const fileList = {
      0: file,
      length: 1,
      item: () => file,
    } as unknown as FileList;
    const event = { currentTarget: { files: fileList } } as unknown as Event;

    const reader = new FileReader();
    spyOn(window, 'FileReader').and.returnValue(reader);
    spyOn(reader, 'readAsText').and.callFake(() => {
      (reader as any).result = yamlContent;
      const mockFileReader = { result: yamlContent } as FileReader;
      reader.onload!(new ProgressEvent('load', { target: mockFileReader }));
    });

    component.onFileSelected(event);
    fixture.detectChanges();

    setTimeout(() => {
      expect(component.yamlContent).toBe(yamlContent);
      expect(component.parsedData).toEqual({ key: 'value' });
      expect(component.loadedFileName).toBe('test.yaml');
      done();
    }, 0);
  });

  it('should load a YAML file from a URL', async () => {
    const yamlContent = 'key: value';
    component.yamlUrl = 'http://test.com/test.yaml';
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response)
    );

    await component.loadFromUrl();
    fixture.detectChanges();

    expect(component.yamlContent).toBe(yamlContent);
    expect(component.parsedData).toEqual({ key: 'value' });
    expect(component.loadedFileName).toBe('test.yaml');
  });

  it('should handle invalid YAML', () => {
    const invalidYaml = 'key: value: another_value';
    component.yamlContent = invalidYaml;
    component.parseYaml();
    fixture.detectChanges();

    expect(component.parsedData).toBeNull();
    expect(component.showErrorModal).toBeTrue();
    expect(component.errorMessage).toContain('Error parsing YAML');
  });

  it('should save a YAML file', () => {
    component.parsedData = { key: 'value' };
    component.loadedFileName = 'test.yaml';
    const link = {
      click: jasmine.createSpy('click'),
    } as unknown as HTMLAnchorElement;
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(URL, 'revokeObjectURL');

    component.saveYaml();

    expect(link.download).toBe('test_edited.yaml');
    expect(link.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });

  it('should add a new row', () => {
    component.parsedData = { key: 'value' };
    component.addRowMenuData = component.parsedData;
    component.addRow('string');
    fixture.detectChanges();

    expect(component.parsedData['new_key']).toBe('new_value');
  });

  it('should remove a row', () => {
    component.parsedData = { key: 'value', key_to_remove: 'value_to_remove' };
    component.removeRow(component.parsedData, 'key_to_remove');
    fixture.detectChanges();

    expect(component.parsedData['key_to_remove']).toBeUndefined();
  });

  it('should edit a key', () => {
    component.parsedData = { key: 'value' };
    const event = { target: { value: 'new_key' } } as unknown as Event;
    component.onKeyEdit(event, 'key', component.parsedData);
    fixture.detectChanges();

    expect(component.parsedData['new_key']).toBe('value');
    expect(component.parsedData['key']).toBeUndefined();
  });

  it('should scroll to the editor card', (done) => {
    component.parsedData = { key: 'value' };
    fixture.detectChanges();
    const spy = spyOn(component.editorCard.nativeElement, 'scrollIntoView');
    component['scrollToEditorCard']();
    setTimeout(() => {
      expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      done();
    }, 100);
  });
});
