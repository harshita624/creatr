import React,{useState,useMemo} from "react"
const orders = [
    {
        id: "ORD-101",
        date: "2026-03-01",
        total: 120.50,
        status: "Delivered",
        items: ["Headphones"]
    },
    {
        id: "ORD-102",
        date: "2026-03-04",
        total: 45.00,
        status: "Processing",
        items: ["Mousepad", "Cable"]
    },
    {
        id: "ORD-103",
        date: "2026-02-15",
        total: 210.00,
        status: "Cancelled",
        items: ["Monitor"]
    }
];

function Order()
{
    const [status,setStatus]=useState("")
    const [sortField,setSortField]=useState("")
    const [sortOrder,setSortOrder]=useState("asc")
    const [expanded,setExpanded]=useState(false)
    function sortBy(field)
    {
        if(field===sortField)
        {
            if(sortOrder==="asc")
            {
                setSortOrder("desc")
            }
            else{
                setSortOrder("asc")
            }
        }
        else{
            setSortField(field)
            setSortOrder("asc")
        }
    }
    const results=useMemo(()=>{
           let data=orders.filter(order=>{
            if(status==="All")return true
            return order.status===status
           })
           data.sort((a,b)=>{
            let x=a[sortField]
            let y=b[sortField]
            if(typeof x==="string")
              {
                if(sortOrder==="asc")
                {
                    return x.localeCompare(y)
                }
                return y.localeCompare(x)
              }
              if(sortOrder==="asc")
              {
                return x-y
              }
              return y-x
           })
           return data
    },[status,sortField,sortOrder])


    function toggle(id)
    {
        if(expanded===id)
        {
            setExpanded(null)
        }
        else{
            setExpanded(id)
        }
    }
    return (
        <div>
        <h2>Order Summary</h2>
        <div>
            {["All", "Delivered", "Processing", "Cancelled"].map(item=>(
                <button key={item} onClick={()=>setStatus(item)} >{item}</button>
            ))}
        </div>
      
<table>
    <thead>
        <tr>
            <th onClick={()=>sortBy("id")} >Order Id</th>
            <th onClick={()=>sortBy("date")} >Date</th>
            <th onClick={()=>sortBy("total")} >Total</th>
        </tr>
    </thead>
    <tbody>
      {results.map(order=>(
        <React.Fragment key={order.id}>
            <tr>
                <td>{order.date}</td>
                <td>{order.total}</td>
                <td>{order.status}</td>
                <button onClick={()=>toggle(order.id)} >{expanded?"hide":"show"}</button>
            </tr>

            {expanded===order.id && (
                <tr>
                    <td colSpan={5}>{order.items.join(", ")}</td>
                </tr>
            )}
        </React.Fragment>
      ))}
    </tbody>
</table>


        </div>
    )
}