import React from "react"
import { BrowserRouter,Routes,Route,Link,Outlet } from "react-router-dom"

function Home()
{
    return(
        <h2>Home</h2>
    )
}
function DashboardHome()
{
    return(
        <h2>DashboardHome</h2>
    )
}
function Profile()
{
    return(
    <h2>Profile</h2>
    )
}
function Settings()
{
    return(
        <h2>Settings</h2>
    )
}
function DashboardLayout()
{
    return(
        <div>
        <nav>
            <Link to="/">Home</Link>
            <Link to="/profile" >Profile</Link>
            <Link to="/settings" >Settings</Link>
        </nav>
        <Outlet/>
        </div>
    )
}
function App()
{
    return(
        <BrowserRouter>
         <Routes>
            <Route to="/"  element={<Home/>}/>
            <Route to="/dashboard"  element={<DashboardLayout/>}>
            <Route index element={<DashboardHome/>} />
            <Route to="/profile"   element={<Profile/>} />
            <Route to="/settings" element={<Settings/>} />
            </Route>
         </Routes>
        </BrowserRouter>
    )
}