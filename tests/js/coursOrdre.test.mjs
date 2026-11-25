// Tests de src/scripts/coursOrdre.js (tri chronologique des cours).
// Lancer : npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Le module s'attache à window.CoursOrdre (script navigateur) : on l'exécute dans un bac à sable.
const source = readFileSync(new URL('../../src/scripts/coursOrdre.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const C = sandbox.window.CoursOrdre;

const tri = (list, cmp) => list.slice().sort(cmp);

test('rangJour : ordre de la semaine, casse et accents tolérés', () => {
  assert.equal(C.rangJour('Lundi'), 0);
  assert.equal(C.rangJour('jeudi'), 3);
  assert.equal(C.rangJour(' DIMANCHE '), 6);
  assert.equal(C.rangJour('Bientôt'), 99, 'jour inconnu → fin de liste');
  assert.equal(C.rangJour(null), 99);
});

test('minutesDebut : première heure de la plage', () => {
  assert.equal(C.minutesDebut('9h30-12h30'), 570);
  assert.equal(C.minutesDebut('18h-21h'), 1080);
  assert.equal(C.minutesDebut('13h30 - 16h'), 810);
  assert.equal(C.minutesDebut(''), 9999);
});

test('cleDateDebut : année scolaire août → juillet', () => {
  const ordre = ['28 Novembre', '8 Décembre', '11 Janvier', '3 Mars']
    .map(d => C.cleDateDebut(d));
  assert.deepEqual(ordre, ordre.slice().sort((a, b) => a - b));
  assert.equal(C.cleDateDebut('15 et 29 Novembre'), C.cleDateDebut('15 Novembre'), 'premier jour retenu');
  assert.equal(C.cleDateDebut('11 decembre'), C.cleDateDebut('11 Décembre'), 'accent facultatif');
  assert.equal(C.cleDateDebut('À venir'), 99999999, 'date illisible → fin de liste');
});

test('cleDateDebut : année déduite de l’année scolaire en cours', () => {
  const nov2026 = new Date(2026, 10, 24);
  assert.equal(C.cleDateDebut('28 Novembre', nov2026), 20261128);
  assert.equal(C.cleDateDebut('11 Janvier', nov2026), 20270111);
  assert.equal(C.cleDateDebut('3 Mars', nov2026), 20270303);
  const mars2027 = new Date(2027, 2, 1);
  assert.equal(C.cleDateDebut('8 Décembre', mars2027), 20261208, 'en mars, décembre est passé');
  assert.equal(C.cleDateDebut('27 Juin 2026', nov2026), 20260627, 'année explicite respectée');
});

test('cleDebut : debut_le prime sur le libellé', () => {
  assert.equal(C.cleDebut({ debut_le: '2027-03-03', date_debut: '11 Janvier' }), 20270303);
  assert.equal(C.cleDebut({ debut_le: null, date_debut: '28 Novembre' }, new Date(2026, 10, 24)), 20261128);
  assert.equal(C.cleDebut({}), 99999999);
});

test('parCreneau : le jeudi ne passe plus avant le lundi', () => {
  const cours = [
    { id: 1, nom: 'Tournage', jour: 'Jeudi', heure: '18h-21h' },
    { id: 2, nom: 'Tournage', jour: 'Samedi', heure: '9h30-12h30' },
    { id: 3, nom: 'Tournage', jour: 'Lundi', heure: '18h-21h' },
    { id: 4, nom: 'Tournage', jour: 'Vendredi', heure: '13h30-16h30' },
  ];
  assert.deepEqual(tri(cours, C.parCreneau).map(c => c.jour), ['Lundi', 'Jeudi', 'Vendredi', 'Samedi']);
});

test('parCreneau : même jour → heure de début, puis nom', () => {
  const cours = [
    { id: 1, nom: 'B', jour: 'Mercredi', heure: '18h-20h30' },
    { id: 2, nom: 'A', jour: 'Mercredi', heure: '18h-20h30' },
    { id: 3, nom: 'C', jour: 'Mercredi', heure: '13h30-16h' },
  ];
  assert.deepEqual(tri(cours, C.parCreneau).map(c => c.nom), ['C', 'A', 'B']);
});

test('parDateDebut : calendrier d’abord, semaine ensuite', () => {
  const cours = [
    { id: 1, nom: 'Pot Pincé', jour: 'Vendredi', heure: '18h-21h', date_debut: '11 Décembre' },
    { id: 2, nom: 'Vitrail de Noël', jour: 'Samedi', heure: '13h-16h30', date_debut: '28 Novembre' },
    { id: 3, nom: 'Lanterne', jour: 'Mardi', heure: '18h-21h', date_debut: '8 Décembre' },
  ];
  assert.deepEqual(tri(cours, C.parDateDebut).map(c => c.id), [2, 3, 1]);
});

test('parDateDebut : mélange de cours avec et sans debut_le', () => {
  const cours = [
    { id: 1, nom: 'Vitrail', jour: 'Mercredi', heure: '18h', date_debut: '3 Mars', debut_le: '2027-03-03' },
    { id: 2, nom: 'Tournage', jour: 'Lundi', heure: '18h', date_debut: '11 Janvier', debut_le: '2027-01-11' },
    { id: 3, nom: 'Pot', jour: 'Vendredi', heure: '18h', date_debut: '11 Décembre', debut_le: null },
  ];
  // id 3 n'a que son libellé : décembre de l'année scolaire en cours, avant janvier.
  const ordre = tri(cours, C.parDateDebut).map(c => c.id);
  assert.equal(ordre[ordre.length - 1], 1);
  assert.ok(ordre.indexOf(2) < ordre.indexOf(1));
});

test('libelleDiscipline : libellé accentué', () => {
  assert.equal(C.libelleDiscipline('ceramique'), 'Céramique');
  assert.equal(C.libelleDiscipline('vitrail'), 'Vitrail');
  assert.equal(C.libelleDiscipline('Mosaïque'), 'Mosaïque');
});
