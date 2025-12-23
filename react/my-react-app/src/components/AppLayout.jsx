import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import '../styles/dashboard.css';

const AppLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AppLayout;

