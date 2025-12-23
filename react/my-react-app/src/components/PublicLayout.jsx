import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import '../styles/style.css';

const PublicLayout = () => {
    return (
        <div>
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default PublicLayout;

