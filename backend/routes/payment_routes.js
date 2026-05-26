import express from 'express';
import { initializePayment, completePayment } from '../controller/payment_controller.js';
import {
    getPatientPaymentHistory,
    getAdminPaymentHistory,
    getAdminPatientPaymentHistory,
} from '../controller/payment_history_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';

const router = express.Router();

/**
 * @swagger
 * /api/payment/initialize-khalti-payment:
 *   post:
 *     tags: [Payments]
 *     summary: Initialize Khalti payment for an appointment
 *     description: |
 *       **Patient** — own appointment (Prepayment retry or Pay Later).
 *       **Receptionist** — Pay Later only, at visit; returns URL for the patient to pay.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointment_id, website_url]
 *             properties:
 *               appointment_id: { type: integer }
 *               website_url: { type: string, example: "http://localhost:3000" }
 *     responses:
 *       200:
 *         description: Initialized payment details
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 success: { type: boolean }
 *                 payment_url: { type: string }
 *                 pidx: { type: string }
 *                 payment_mode: { type: string, enum: [Prepayment, Pay Later] }
 */
router.post(
    '/initialize-khalti-payment',
    verifyJWT,
    verifyRole(ROLES.PATIENT, ROLES.RECEPTIONIST),
    initializePayment
);

/**
 * @swagger
 * /api/payment/complete-khalti-payment:
 *   get:
 *     tags: [Payments]
 *     summary: Callback for Khalti payment redirection (public)
 *     parameters:
 *       - { name: pidx, in: query, schema: { type: string } }
 *       - { name: transaction_id, in: query, schema: { type: string } }
 *     responses:
 *       200: { description: Redirects or returns JSON status }
 */
router.get('/complete-khalti-payment', completePayment);

/**
 * @swagger
 * /api/payment/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get patient payment history
 *     description: Without start_date/end_date returns the latest 10 payments. With dates, filters by payment_date range.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *       - { name: status, in: query, schema: { type: string, enum: [pending, completed, refunded] } }
 *       - { name: transaction_type, in: query, schema: { type: string, enum: [credit, debit] } }
 *     responses:
 *       200: { description: Paginated payment history }
 */
router.get('/history', verifyJWT, verifyRole(ROLES.PATIENT), getPatientPaymentHistory);

/**
 * @swagger
 * /api/payment/admin/history:
 *   get:
 *     tags: [Payments - Admin]
 *     summary: Admin views all payment history (defaults to today)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: patient_id, in: query, schema: { type: integer }, description: Optional filter by patient }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *       - { name: status, in: query, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated payment history }
 */
router.get('/admin/history', verifyJWT, verifyRole(ROLES.ADMIN), getAdminPaymentHistory);

/**
 * @swagger
 * /api/payment/admin/history/{patient_id}:
 *   get:
 *     tags: [Payments - Admin]
 *     summary: Admin views payment history for a specific patient
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: patient_id, in: path, required: true, schema: { type: integer } }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated payment history }
 */
router.get('/admin/history/:patient_id', verifyJWT, verifyRole(ROLES.ADMIN), getAdminPatientPaymentHistory);

export default router;