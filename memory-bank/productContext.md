# Product Context

This file provides a high-level overview of the project and the expected product that will be created.

## Project Goal

* Web application for displaying daily lunch menus from restaurants near Patrónka, Bratislava
* Fork of the original at11 project (which was for ERNI Slovakia office)
* Aims to simplify lunch decision-making by aggregating multiple restaurant menus in one place
* Focus on reliability and maintainability of menu fetching system

## Key Features

* Daily menu fetching from multiple restaurants
* Web interface for menu display
* Caching system for performance
* TypeScript-based implementation
* Modular parser system for different restaurant sources
* Advanced web scraping capabilities for complex restaurant sites
* Comprehensive error handling and debugging
* Session management for protected restaurant pages

## Overall Architecture

* Node.js/TypeScript backend
* Express.js web server
* Cheerio for basic HTML parsing
* Puppeteer for complex web scraping
* Handlebars (hbs) for view templating
* Modular structure with separate parsers for each restaurant
* Test framework with Mocha
* ESLint for code quality
* Debug logging system for maintenance

[2025-05-09 13:49:44] - Initial Memory Bank creation
[2025-05-10 14:22:00] - Updated with new architectural components and features