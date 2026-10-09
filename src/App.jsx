import React from "react";

import Home from "./pages/Home";
import Articles from "./pages/Articles";
import Article from "./pages/Article";
import Categories from "./pages/Categories";
import Contact from "./pages/Contact";
import About from "./pages/About";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./components/admin/AdminRoute";
import Unsubscribe from "./pages/Unsubscribe";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./components/404";

import { Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <div>
      {/* <Navbar /> */}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/article/:slug" element={<Article />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />



        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>


      {/* <Footer /> */}

    </div>
  );
};

export default App;