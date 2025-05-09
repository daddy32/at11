# Product Context

This file provides a high-level overview of the project and the expected product that will be created.

## Project Goal

* Web application for displaying daily lunch menus from restaurants near Patrónka, Bratislava
* Fork of the original at11 project (which was for ERNI Slovakia office)
* Aims to simplify lunch decision-making by aggregating multiple restaurant menus in one place

## Key Features

* Daily menu fetching from multiple restaurants
* Web interface for menu display
* Caching system for performance
* TypeScript-based implementation
* Modular parser system for different restaurant sources

## Overall Architecture

* Node.js/TypeScript backend
* Express.js web server
* Cheerio for HTML parsing
* Handlebars (hbs) for view templating
* Modular structure with separate parsers for each restaurant
* Test framework with Mocha
* ESLint for code quality

[2025-05-09 13:49:44] - Initial Memory Bank creation