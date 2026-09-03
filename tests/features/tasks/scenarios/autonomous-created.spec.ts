import { test, expect } from '@playwright/test';
import { AutonomousTasksPage } from '../autonomous-tasks.page';

test.describe('Gestion des tâches', () => {
  let tasksPage: AutonomousTasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new AutonomousTasksPage(page);
    await page.goto('http://localhost:3000');
  });

  test('Ajouter une tâche GOUONGO100 et supprimer la tâche JULES', async () => {
    // Ajouter la tâche GOUONGO100
    await tasksPage.addTask('GOUONGO100');
    await expect(tasksPage.successMessage).toBeVisible();

    // Vérifier que la tâche GOUONGO100 est dans la liste
    await expect(tasksPage.taskItem('GOUONGO100')).toBeVisible();

    // Supprimer la tâche JULES si elle existe
    try {
      await tasksPage.deleteTask('JULES');
      // Vérifier que la tâche JULES n'est plus dans la liste
      await expect(tasksPage.taskItem('JULES')).not.toBeVisible();
    } catch (error) {
      console.log('La tâche JULES n\'existe pas dans la liste.');
    }

    // Vérifier que la tâche GOUONGO100 est toujours dans la liste
    await expect(tasksPage.taskItem('GOUONGO100')).toBeVisible();
  });
});