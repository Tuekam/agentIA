import { Locator, Page } from '@playwright/test';

export class AutonomousTasksPage {
  readonly page: Page;
  readonly newTaskInput: Locator;
  readonly addTaskButton: Locator;
  readonly taskItem: (taskName: string) => Locator;
  readonly deleteTaskButton: (taskName: string) => Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTaskInput = page.getByPlaceholder('Nouvelle tâche...');
    this.addTaskButton = page.getByRole('button', { name: 'Ajouter' });
    this.successMessage = page.getByText('Tâche ajoutée avec succès');
    this.taskItem = (taskName: string) => page.locator('div').filter({ hasText: taskName }).first();
    this.deleteTaskButton = (taskName: string) => this.taskItem(taskName).getByRole('button', { name: 'Supprimer' });
  }

  async addTask(taskName: string) {
    await this.newTaskInput.fill(taskName);
    await this.addTaskButton.click();
  }

  async deleteTask(taskName: string) {
    await this.deleteTaskButton(taskName).click();
    await this.page.getByRole('button', { name: 'Supprimer' }).click();
  }
}