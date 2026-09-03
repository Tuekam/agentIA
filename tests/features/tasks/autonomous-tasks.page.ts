import { Locator, Page } from '@playwright/test';

export class TaskPage {
  readonly page: Page;
  readonly title: Locator;
  readonly taskInput: Locator;
  readonly addButton: Locator;
  readonly taskRetryTest: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByText('Tâches');
    this.taskInput = page.getByPlaceholder('Nouvelle tâche...');
    this.addButton = page.getByRole('button', { name: 'Ajouter' });
    this.taskRetryTest = page.getByText('RETRY TEST').first();
  }

  async goto() {
    await this.page.goto('http://localhost:3000');
  }

  async addTask(taskName: string) {
    await this.taskInput.fill(taskName);
    await this.addButton.click();
  }
}