import { mount } from 'svelte'
import App from './App.svelte'
import '@fontsource-variable/bricolage-grotesque'
import './app.css'

mount(App, { target: document.getElementById('app')! })
