import { test, expect } from '@playwright/test';
import { TasksPage } from '../autonomous-tasks.page';

test.describe('Gestion des tâches', () => {
  let tasksPage: TasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
    await page.goto('http://localhost:3000');
  });

  test('Ajouter une nouvelle tâche et supprimer une tâche existante', async () => {
    const newTaskName = 'JULESPLAY';
    const taskToDelete = 'JULES';

    // Ajouter la nouvelle tâche
    await tasksPage.addTask(newTaskName);
    
    // Vérifier que la tâche a été ajoutée
    const taskExists = await tasksPage.taskExists(newTaskName);
    expect(taskExists).toBeTruthy();

    // Supprimer la tâche existante
    await tasksPage.deleteTask(taskToDelete);

    // Vérifier que la tâche supprimée n'existe plus
    const taskDeleted = await tasksPage.taskExists(taskToDelete);
    expect(taskDeleted).toBeFalsy();
  });
});