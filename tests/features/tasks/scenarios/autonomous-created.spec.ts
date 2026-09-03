import { test, expect } from '@playwright/test';
import { TaskPage } from '../autonomous-tasks.page';

test('Ajouter une tâche RETRY TEST et vérifier sa présence', async ({ page }) => {
  const taskPage = new TaskPage(page);
  await taskPage.goto();

  // Vérifier que la page est bien chargée
  await expect(taskPage.title).toBeVisible();

  // Ajouter une nouvelle tâche
  await taskPage.addTask('RETRY TEST');

  // Vérifier que la tâche est bien présente dans la liste
  await expect(taskPage.taskRetryTest).toBeVisible();
});