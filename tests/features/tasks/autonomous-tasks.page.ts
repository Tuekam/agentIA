import { Locator, Page } from '@playwright/test';

export class TasksPage {
  readonly page: Page;
  readonly newTaskInput: Locator;
  readonly addButton: Locator;
  readonly taskItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTaskInput = page.locator('input[placeholder="Nouvelle tâche..."]');
    this.addButton = page.getByRole('button', { name: 'Ajouter' });
    this.taskItems = page.locator('div[class*="TaskItem"]');
  }

  async addTask(taskName: string) {
    await this.newTaskInput.fill(taskName);
    await this.addButton.click();
  }

  async deleteTask(taskName: string) {
    const taskItem = this.taskItems.filter({ hasText: taskName }).first();
    await taskItem.getByRole('button', { name: 'Supprimer' }).first().click();
  }

  async taskExists(taskName: string): Promise<boolean> {
    const taskItem = this.taskItems.filter({ hasText: taskName }).first();
    return (await taskItem.count()) > 0;
  }
}