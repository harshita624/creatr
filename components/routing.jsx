import React from "react"
import { BrowserRouter,Routes,Route,Link } from "react-router-dom"

function Home()
{
    return(
        <h2>Home</h2>
    )
}
function About()
{
    return(
        <h2>About</h2>
    )
}
function Contact()
{
    return(
        <h2>Contact</h2>
    )
}
function App()
{
    return(
        <BrowserRouter>
        <Link to="/" >Home</Link>
        <Link to="/about" >About</Link>
        <Link to="/contact" >Contact</Link>
        <Routes>
            <Route to="/" element={<Home/>} />
            <Route to="/about" element={<About/>} />
            <Route to="/contact" element={<Contact/>} />
        </Routes>
        </BrowserRouter>
    )
}