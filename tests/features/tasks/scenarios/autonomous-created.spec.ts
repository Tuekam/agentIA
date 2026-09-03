import { test, expect } from '@playwright/test';

test('Ajouter, vérifier et supprimer une tâche nommée "TEST SIMPLE deux"', async ({ page }) => {
  // Accéder à l'application
  await page.goto('http://localhost:3000');

  // Vérifier que l'application est bien chargée
  await expect(page.getByRole('heading', { name: 'Tâches' })).toBeVisible();

  // Remplir le champ d'ajout de tâche avec "TEST SIMPLE deux"
  const nouvelleTacheInput = page.getByPlaceholder('Nouvelle tâche...');
  await nouvelleTacheInput.fill('TEST SIMPLE deux');

  // Cliquer sur le bouton "Ajouter"
  await page.getByRole('button', { name: 'Ajouter' }).click();

  // Vérifier que la tâche "TEST SIMPLE deux" est bien présente
  await expect(page.getByText('TEST SIMPLE deux')).toBeVisible();

  // Supprimer la tâche "TEST SIMPLE deux"
  // Localiser la tâche par son texte et cliquer sur le bouton "Supprimer" associé
  const tacheElement = page.getByText('TEST SIMPLE deux').first();
  const supprimerButton = tacheElement.locator('..').getByRole('button', { name: 'Supprimer' });
  await supprimerButton.click();

  // Vérifier que la tâche "TEST SIMPLE deux" n'est plus présente
  await expect(page.getByText('TEST SIMPLE deux')).not.toBeVisible();
});