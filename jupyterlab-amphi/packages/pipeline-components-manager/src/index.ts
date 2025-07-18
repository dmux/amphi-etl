import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { LabIcon } from '@jupyterlab/ui-components';
import { Token } from '@lumino/coreutils';

export { setDefaultConfig, onChange, GenerateUIFormComponent, FieldDescriptor, Option } from './configUtils';
export { renderComponentUI, renderHandle, createZoomSelector } from './rendererUtils'
export { PipelineComponent } from './PipelineComponent'
export { CodeGenerator } from './CodeGenerator'
export { CodeGeneratorDagster } from './CodeGeneratorDagster'
export { CodeGeneratorGlue } from './CodeGeneratorGlue'
export { PipelineService } from './PipelineService'
export { RequestService } from './RequestService'

export { InputFile, InputRegular, SelectRegular, SelectColumns, CodeTextarea, CodeTextareaMirror } from './forms'

interface ComponentItem {
  _id: string;
  _name: string;
  _type: string;
  _icon: LabIcon;
  _default: object;
  _form: object;
}

interface Components {
  getComponents(): any;
  getComponent(type: string): ComponentItem;
  addComponent(newComponent: ComponentItem): any;
  removeComponent(id: string): void;
}

const ComponentManager = new Token<Components>(
  '@amphi/pipeline-components-manager:provider');

class ComponentService implements Components {

  _components: ComponentItem[] = [];

  constructor() {
    this._components = [];
  }

  getComponents() {
    return this._components;
  };

  getComponent(id: string): ComponentItem | undefined {
    return this._components.find(component => component._id === id);
  };

  addComponent(newComponent: ComponentItem) {
    this._components.push(newComponent)
  };

  // Method to get the number of components
  getComponentCount(): number {
    return this._components.length;
  }

  removeComponent(id: string): void {
    this._components = this._components.filter(component => component._id !== id);
  }
}

const plugin: JupyterFrontEndPlugin<Components> = {
  id: '@amphi/pipeline-components-manager:plugin',
  description: 'Provider plugin for the pipeline editor\'s "component" service object.',
  autoStart: true,
  provides: ComponentManager,
  activate: () => {
    console.log('JupyterLab extension (@amphi/pipeline-components-manager/provider plugin) is activated!');
    const componentService = new ComponentService();
    return componentService;
  }
};

export { ComponentItem, Components, ComponentManager };
export default plugin;