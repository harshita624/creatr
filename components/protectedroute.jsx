import React,{useState} from "react"
import { BrowserRouter,Routes,Route,Link,Navigate } from "react-router-dom"
function Login({setLoggedIn})
{
    function login()
    {
      setLoggedIn(true)
    }
    return(
        <div>
            <h2>Login Page</h2>
            <button  onClick={login}>Login</button>
        </div>
    )
}
function Home()
{
    return (
        <h2>Home Page</h2>
    )
}
function Dashboard({loggedIn})
{
    
    return (
        
        <h2>Dashboard Page</h2>
    )
}
function Protected({loggedIn,children})
{
    if(!loggedIn)
    {
        <Navigate to="/login" />
    }
    return children
}
function App()
{
    const [loggedIn,setLoggedIn]=useState(false)

    return(
        <div>
            <nav>
                <Link to="/" >Home</Link>
                <Link to="/login" >Login</Link>
                <Link to="/dashboard" >Dashboard</Link>
            </nav>
            <Routes>
                <Route to="/"  element={<Home/>}/>
                <Route to="/login" element={<Login setLoggedIn={setLoggedIn}/>} />
                <Route to="/dashboard" element={<Protected loggedIn={loggedIn}>
                       <Dashboard/>
                </Protected>} />
            </Routes>
        </div>
    )
}